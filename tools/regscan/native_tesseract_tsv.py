# Run native tesseract on a preprocessed image, output JSON lines with words+bbox (same shape as tesseract.js data.lines)
import subprocess, json, sys, csv, io
def ocr_lines(png, psm='6'):
    out=subprocess.run(['tesseract',png,'-','--psm',psm,'tsv'],capture_output=True,text=True).stdout
    rows=list(csv.DictReader(io.StringIO(out),delimiter='\t',quoting=csv.QUOTE_NONE))
    lines={}
    for r in rows:
        if r['level']!='5' or not r['text'].strip(): continue
        k=(r['block_num'],r['par_num'],r['line_num'])
        lines.setdefault(k,[]).append({'text':r['text'],'conf':float(r['conf']),'bbox':{'x0':int(r['left']),'y0':int(r['top']),'x1':int(r['left'])+int(r['width']),'y1':int(r['top'])+int(r['height'])}})
    res=[]
    for k,ws in lines.items():
        res.append({'text':' '.join(w['text'] for w in ws),'words':ws,'bbox':{'x0':min(w['bbox']['x0'] for w in ws),'y0':min(w['bbox']['y0'] for w in ws),'x1':max(w['bbox']['x1'] for w in ws),'y1':max(w['bbox']['y1'] for w in ws)}})
    res.sort(key=lambda l:(l['bbox']['y0']))
    return res
if __name__=='__main__':
    print(json.dumps(ocr_lines(sys.argv[1], sys.argv[2] if len(sys.argv)>2 else '6'),ensure_ascii=False))
