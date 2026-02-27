import subprocess,sys,datetime,time,json,os
net_dt = '2026-02-25T11:35:03.9207505'
from datetime import datetime,timezone
try:
    nd = datetime.fromisoformat(net_dt)
except Exception:
    nd = datetime.strptime(net_dt.split('.') [0], '%Y-%m-%dT%H:%M:%S')
nd = nd.replace(tzinfo=timezone.utc)
network_epoch = nd.timestamp()
system_epoch = float(subprocess.check_output(['date','-u','+%s']).decode().strip())
THRESH=60
logpath='/home/ubuntu/.openclaw/workspace/logs/cron_time_check.log'
failpath='/home/ubuntu/.openclaw/cron/cron_time_check.failcount'
os.makedirs(os.path.dirname(logpath),exist_ok=True)
os.makedirs(os.path.dirname(failpath),exist_ok=True)
now = datetime.now(timezone.utc).isoformat()
initial_diff = abs(network_epoch - system_epoch)
entry = []
entry.append(f"{now} NETWORK_UTC={nd.isoformat()} NETWORK_EPOCH={network_epoch:.3f} SYSTEM_EPOCH={system_epoch:.3f} DIFF_SECONDS={initial_diff:.3f}")
persistent=False
send_flag=False
doctor_output=''
if initial_diff>THRESH:
    entry.append('Difference > THRESHOLD; attempting corrective steps: set-ntp off -> on')
    try:
        subprocess.run(['sudo','timedatectl','set-ntp','off'],check=True,timeout=30)
        time.sleep(2)
        subprocess.run(['sudo','timedatectl','set-ntp','on'],check=True,timeout=30)
        time.sleep(2)
    except Exception as e:
        entry.append(f'Timedatectl steps error: {e}')
    system_epoch2 = float(subprocess.check_output(['date','-u','+%s']).decode().strip())
    diff2 = abs(network_epoch - system_epoch2)
    entry.append(f'Post-correct SYSTEM_EPOCH={system_epoch2:.3f} DIFF_SECONDS={diff2:.3f}')
    if diff2>THRESH:
        entry.append("Difference still > THRESHOLD; running 'openclaw doctor --fix'")
        try:
            p = subprocess.run(['openclaw','doctor','--fix'],check=False,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=300)
            doctor_output = p.stdout.decode()
            entry.append('openclaw doctor exitcode=%d'%p.returncode)
            entry.append('openclaw doctor output:\n'+doctor_output)
        except Exception as e:
            doctor_output = str(e)
            entry.append(f'openclaw doctor error: {e}')
        if diff2>THRESH or ('unresolved' in doctor_output.lower()) or (p.returncode!=0):
            persistent=True
    else:
        persistent=False
else:
    entry.append('Difference within threshold; no action needed.')
    persistent=False
count=0
try:
    with open(failpath,'r') as f:
        count=int(f.read().strip() or '0')
except Exception:
    count=0
if persistent:
    count+=1
    entry.append(f'Persistent failure detected; incremented failcount to {count}')
    if count>=12:
        send_flag=True
        count=0
        entry.append('Failcount reached threshold (12); will send Telegram and reset count to 0')
else:
    if count!=0:
        entry.append('Issue resolved; resetting failcount to 0')
    count=0
try:
    with open(failpath,'w') as f:
        f.write(str(count))
except Exception as e:
    entry.append(f'Failed to write failcount file: {e}')
try:
    with open(logpath,'a') as f:
        f.write('\n'.join(entry)+"\n---\n")
except Exception as e:
    print(json.dumps({"error":"failed to write log","details":str(e)}))
out={"persistent":persistent,"send_flag":send_flag,"logpath":logpath,"failcount":count}
print(json.dumps(out))
