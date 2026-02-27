#!/usr/bin/env python3
import sys,json,datetime
s=sys.stdin.read()
try:
    j=json.loads(s)
    dt=j.get('dateTime')
    if not dt:
        sys.exit(0)
    if dt.endswith('Z'):
        dt=dt[:-1]
    if '.' in dt:
        base,frac=dt.split('.')
        frac=frac[:6]
        dt=base+'.'+frac
    ts=int(datetime.datetime.fromisoformat(dt).replace(tzinfo=datetime.timezone.utc).timestamp())
    print(ts)
except Exception:
    pass
