import urllib.request
import urllib.parse
import os

doc_id = "1RgaOUmSA1sCaLwkApPNw1gObzOjWAauhxDQflFMkazY"
sheet_names = ["Cálculo de Cuota", "Control de Pagos", "Pendientes", "Análisis Comprobantes", "Historial", "Egresos"]
out_dir = r"C:\Users\migue\Documents\dashboard festival sion"

for sheet in sheet_names:
    encoded_name = urllib.parse.quote(sheet)
    url = f"https://docs.google.com/spreadsheets/d/{doc_id}/gviz/tq?tqx=out:csv&sheet={encoded_name}"
    out_file = os.path.join(out_dir, f"{sheet.replace(' ', '_')}.csv")
    try:
        print(f"Downloading {sheet}...")
        urllib.request.urlretrieve(url, out_file)
        print(f"Saved to {out_file}")
    except Exception as e:
        print(f"Error downloading {sheet}: {e}")
