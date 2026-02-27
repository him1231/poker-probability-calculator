#!/usr/bin/env python3
import os, sys, subprocess, json, datetime, time, pathlib, traceback
THRESHOLD_SECONDS = int(os.getenv('THRESHOLD_SECONDS','60'))
SOURCE = 'timeapi.io'
LOG = '/home/ubuntu/.openclaw/workspace/logs/cron_time_check.log'
FAILFILE = '/home/ubuntu/.openclaw/cron/cron_time_check.failcount'
os.makedirs(os.path.dirname(LOG), exist_ok=True)
os.makedirs(os.path.dirname(FAILFILE), exist_ok=True)

def log(msg):
    ts = datetime.datetime.utcnow().isoformat()+'Z'
    with open(LOG,'a') as f:
        f.write(f"{ts} {msg}\n")

def read_failcount():
    try:
        with open(FAILFILE,'r') as f:
            return int(f.read().strip() or '0')
    except Exception:
        return 0

def write_failcount(n):
    try:
        with open(FAILFILE,'w') as f:
            f.write(str(int(n)))
        return True
    except Exception as e:
        log(f"ERROR writing failcount: {e}")
        return False

result = {'notify': False, 'message': ''}

try:
    # Fetch network UTC from timeapi.io
    import urllib.request, json as _json
    url = 'https://timeapi.io/api/Time/current/zone?timeZone=UTC'
    req = urllib.request.Request(url, headers={'User-Agent':'cron_time_check/1'})
    with urllib.request.urlopen(req, timeout=10) as r:
        body = r.read().decode()
    j = _json.loads(body)
    # timeapi.io returns "dateTime": "2026-02-26T05:30:00"
    net_dt_str = j.get('dateTime')
    if not net_dt_str:
        raise RuntimeError('no dateTime in response: '+repr(j))
    net_dt = datetime.datetime.fromisoformat(net_dt_str)
    net_ts = net_dt.replace(tzinfo=datetime.timezone.utc).timestamp()
    # system UTC
    sys_ts = datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc).timestamp()
    diff = abs(net_ts - sys_ts)
    log(f"NETWORK_UTC={net_dt.isoformat()} SYSTEM_UTC={datetime.datetime.utcfromtimestamp(sys_ts).isoformat()} DIFF_SECONDS={diff}")

    if diff > THRESHOLD_SECONDS:
        log(f"Difference {diff} > THRESHOLD_SECONDS ({THRESHOLD_SECONDS}), attempting corrective steps")
        # attempt corrective steps
        steps = []
        # a) sudo timedatectl set-ntp off; wait 2s; b) on; wait 2s
        for cmd in [['sudo','timedatectl','set-ntp','off'], ['sleep','2'], ['sudo','timedatectl','set-ntp','on'], ['sleep','2']]:
            try:
                subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                steps.append({'cmd':' '.join(cmd),'ok':True})
            except subprocess.CalledProcessError as e:
                steps.append({'cmd':' '.join(cmd),'ok':False,'returncode':e.returncode,'stderr':e.stderr.decode(errors='ignore')})
        log('Corrective steps: '+json.dumps(steps))
        # re-check
        sys_ts2 = datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc).timestamp()
        diff2 = abs(net_ts - sys_ts2)
        log(f"After corrective steps SYSTEM_UTC={datetime.datetime.utcfromtimestamp(sys_ts2).isoformat()} DIFF_SECONDS={diff2}")
        persistent = False
        doctor_output = None
        if diff2 > THRESHOLD_SECONDS:
            persistent = True
            # run openclaw doctor --fix
            try:
                p = subprocess.run(['openclaw','doctor','--fix'], check=False, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=120)
                doctor_output = p.stdout.decode(errors='ignore')
                log('openclaw doctor --fix output:\n'+doctor_output)
                # crude check: if doctor_output contains 'unresolved' or 'failed' mark unresolved
                if 'unresolved' in doctor_output.lower() or 'failed' in doctor_output.lower():
                    persistent = True
                else:
                    # if doctor fixed things, maybe resolved; recompute diff against current system time
                    sys_ts3 = datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc).timestamp()
                    diff3 = abs(net_ts - sys_ts3)
                    log(f"After doctor SYSTEM_UTC={datetime.datetime.utcfromtimestamp(sys_ts3).isoformat()} DIFF_SECONDS={diff3}")
                    if diff3 <= THRESHOLD_SECONDS:
                        persistent = False
            except Exception as e:
                log('ERROR running openclaw doctor --fix: '+traceback.format_exc())
                persistent = True
        else:
            persistent = False

        if persistent:
            # increment failcount
            cnt = read_failcount() + 1
            write_failcount(cnt)
            log(f"Persistent failure detected. Incremented failcount to {cnt}")
            if cnt >= 12:
                # prepare notify
                msg = f"Time sync persistent failure: network UTC from {SOURCE} is {net_dt.isoformat()} but system UTC differs by {diff2} seconds after corrective attempts. See {LOG}"
                result['notify'] = True
                result['message'] = msg
                write_failcount(0)
                log('Failcount reached threshold; will notify and reset counter to 0')
        else:
            # resolved: reset failcount
            write_failcount(0)
            log('Issue resolved by corrective steps; failcount reset to 0')
    else:
        # OK: reset failcount
        write_failcount(0)
        log('No significant difference; failcount reset to 0')

except Exception as e:
    log('ERROR in cron_time_check: '+traceback.format_exc())
    # on unexpected error, do not notify externally but increment failcount conservatively
    cnt = read_failcount() + 1
    write_failcount(cnt)
    log(f"Incremented failcount to {cnt} due to error")
    if cnt >= 12:
        msg = f"Time check script error after 12 failures. See {LOG} for details. Last exception: {str(e)[:200]}"
        result['notify'] = True
        result['message'] = msg
        write_failcount(0)

# print JSON result for caller
print(json.dumps(result))
