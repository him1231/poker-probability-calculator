import os
import sys
from pathlib import Path
import time
import pandas as pd

SERVICE_ACCOUNT_FILE = '/home/ubuntu/.openclaw/workspace/adept-mountain-488501-v9-5550fb5978cf.json'
SPREADSHEET_NAME = 'Trip: Korea Mar14-19'
CSV_MAP = {
    'AI_Data': 'trip_sheet_template_AI_Data.csv',
    'Human_View': 'human_view_template.csv',
    'Meta_Log': 'meta_log_template.csv'
}

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

try:
    import gspread
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
except Exception as e:
    print('MISSING_LIBS', e)
    sys.exit(2)

creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
client = gspread.authorize(creds)

drive_service = build('drive', 'v3', credentials=creds)

# Create spreadsheet
spreadsheet = client.create(SPREADSHEET_NAME)
# Move to root (optional) and set permissions later
spreadsheet_id = spreadsheet.id
print('SPREADSHEET_ID', spreadsheet_id)

# Share with provided email
share_email = 'tszhimmak@gmail.com'
# Use Drive API to create permission
perm = {
    'type': 'user',
    'role': 'writer',
    'emailAddress': share_email
}
try:
    drive_service.permissions().create(fileId=spreadsheet_id, body=perm, fields='id').execute()
    print('SHARED_WITH', share_email)
except Exception as e:
    print('SHARE_ERROR', e)

# For each CSV, create or clear worksheet and upload
for sheet_name, csv_name in CSV_MAP.items():
    csv_path = Path('/home/ubuntu/.openclaw/workspace') / csv_name
    if not csv_path.exists():
        print('MISSING_CSV', csv_path)
        continue
    df = pd.read_csv(csv_path)
    try:
        try:
            ws = spreadsheet.worksheet(sheet_name)
            # clear
            ws.clear()
        except gspread.exceptions.WorksheetNotFound:
            ws = spreadsheet.add_worksheet(title=sheet_name, rows=str(max(100, len(df)+10)), cols=str(max(10, len(df.columns))))
        # Prepare values (list of lists)
        values = [list(df.columns)] + df.fillna('').astype(str).values.tolist()
        ws.update(values)
        print('WROTE', sheet_name, 'rows', len(values)-1)
    except Exception as e:
        print('WRITE_ERROR', sheet_name, e)

# Set timezone / formatting is limited via Sheets API; skip detailed formatting
print('DONE')
print('SPREADSHEET_URL', f'https://docs.google.com/spreadsheets/d/{spreadsheet_id}')
