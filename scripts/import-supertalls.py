#!/usr/bin/env python3
"""Import factual rows from completed/topped-out supertall lists; retain source attribution.
No images or article prose. Table rows are not a guarantee of real-world completeness.
"""
import datetime,json,pathlib,re,urllib.request,urllib.parse
from html.parser import HTMLParser
class Tables(HTMLParser):
 def __init__(self):super().__init__();self.tables=[];self.depth=0;self.rows=[];self.cells=[];self.cell=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='table':
   self.depth+=1
   if self.depth==1:self.rows=[]
  if self.depth!=1:return
  if tag=='tr':self.cells=[]
  if tag in ('td','th'):self.cell={'text':'','links':[],'rowspan':int(a.get('rowspan','1')),'colspan':int(a.get('colspan','1'))}
  if tag=='a' and self.cell is not None:self.cell['links'].append(a.get('href',''))
 def handle_endtag(self,tag):
  if self.depth==1:
   if tag in ('td','th') and self.cell is not None:self.cells.append(self.cell);self.cell=None
   if tag=='tr' and self.cells:self.rows.append(self.cells);self.cells=[]
   if tag=='table':self.tables.append(self.rows)
  if tag=='table':self.depth-=1
 def handle_data(self,data):
  if self.depth==1 and self.cell is not None:self.cell['text']+=data

def expand(table):
 pending={};result=[]
 for row in table:
  out=[];col=0
  def carried():
   nonlocal col
   while col in pending:
    cell,left=pending[col];out.append(cell)
    if left==1:del pending[col]
    else:pending[col]=(cell,left-1)
    col+=1
  for cell in row:
   carried()
   for _ in range(cell['colspan']):
    out.append(cell)
    if cell['rowspan']>1:pending[col]=(cell,cell['rowspan']-1)
    col+=1
  carried();result.append(out)
 return result

def clean(s):return re.sub(r'\[[^]]*\]','',s).strip()
def main():
 records=[];reports=[]
 for name,minimum in [('List_of_supertall_skyscrapers',300),('List_of_megatall_skyscrapers',600)]:
  url='https://en.wikipedia.org/wiki/'+name
  html=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Sight3D-ReferenceImporter/1.0 (https://github.com/tackleguy/sight3d)'}),timeout=30).read().decode()
  p=Tables();p.feed(html)
  candidates=[expand(t) for t in p.tables if t and any('Building' in c['text'] for c in t[0]) and any('Rank'==c['text'].strip() for c in t[0]) and any('Height' in c['text'] for c in t[0])]
  if len(candidates)!=1:raise RuntimeError('Source table layout changed: '+url)
  table=candidates[0];headers=[clean(c['text']) for c in table[0]]
  building=headers.index('Building');city=headers.index('City');height=next(i for i,h in enumerate(headers) if h.startswith('Height'));floors=headers.index('Floors')
  count=0
  for row in table[1:]:
   if len(row)!=len(headers):raise RuntimeError('Unexpected table columns: '+str([c['text'] for c in row]))
   label=clean(row[building]['text']);match=re.match(r'([0-9,]+(?:\.[0-9]+)?)',clean(row[height]['text']))
   if not match:raise RuntimeError('Missing height: '+label)
   meters=float(match[1].replace(',',''))
   if meters<minimum:raise RuntimeError('Height below source threshold: '+label)
   links=[l for l in row[building]['links'] if (l.startswith('/wiki/') or l.startswith('./')) and not any(x in l for x in ('File:','Help:','Special:'))]
   link=urllib.parse.urljoin(url,links[0]) if links else url
   id='wiki:'+urllib.parse.quote(label,safe='')
   record={'id':id,'name':label,'categories':['supertall','skyscraper'],'city':clean(row[city]['text']),'heightM':meters,'source':url,'buildingPage':link,'description':'Listed in the source completed/topped-out table; source facts may need independent verification. No footprint or facade geometry supplied.'}
   if minimum==600:record['categories'].append('megatall')
   n=re.match(r'\d+',clean(row[floors]['text']))
   if n:record['floors']=int(n[0])
   records.append(record);count+=1
  reports.append({'source':url,'rowsImported':count,'license':'CC BY-SA 4.0; factual table subset adapted from Wikipedia contributors'})
 out=pathlib.Path(__file__).resolve().parents[1]/'data/architecture'
 (out/'supertalls.json').write_text(json.dumps(records,ensure_ascii=False,separators=(',',':'))+'\n')
 (out/'supertall-coverage.json').write_text(json.dumps({'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sources':reports,'scope':'Every row of the fetched completed/topped-out supertall and completed megatall tables. Does not certify complete worldwide coverage or include all proposals.'},ensure_ascii=False,separators=(',',':'))+'\n')
 print(len(records),reports)
if __name__=='__main__':main()
