#!/usr/bin/env python3
"""Import factual team-directory/venue names, never images or page text.
The public directory is a snapshot, not a guarantee of current venue accuracy.
Known source conflicts use a separately cited official-venue correction.
"""
import concurrent.futures,datetime,hashlib,json,pathlib,urllib.request,time
ROOT=pathlib.Path(__file__).resolve().parents[1];CACHE=pathlib.Path('/tmp/sight3d-team-import');CACHE.mkdir(exist_ok=True)
LEAGUES=[('football','nfl','National Football League'),('baseball','mlb','Major League Baseball'),('basketball','nba','National Basketball Association'),('hockey','nhl','National Hockey League'),('basketball','wnba',"Women's National Basketball Association"),('soccer','usa.1','Major League Soccer'),('soccer','usa.nwsl',"National Women's Soccer League"),('soccer','eng.1','Premier League'),('soccer','esp.1','La Liga'),('soccer','ger.1','Bundesliga'),('soccer','ita.1','Serie A'),('soccer','fra.1','Ligue 1'),('soccer','ned.1','Eredivisie'),('soccer','por.1','Primeira Liga'),('soccer','bra.1','Campeonato Brasileiro Série A'),('soccer','arg.1','Argentine Primera División'),('soccer','mex.1','Liga MX'),('soccer','ksa.1','Saudi Pro League'),('soccer','jpn.1','J1 League'),('soccer','aus.1','A-League Men')]
def fetch(url):
 p=CACHE/(hashlib.sha256(url.encode()).hexdigest()+'.json')
 if p.exists():return json.loads(p.read_text())
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Sight3D reference research (https://github.com/tackleguy/sight3d)'}),timeout=25) as response:d=json.load(response)
 p.write_text(json.dumps(d));return d

def main():
 records={};reports=[];errors=[]
 for sport,code,name in LEAGUES:
  if code=='mlb':
   source='https://statsapi.mlb.com/api/v1/teams?sportId=1&hydrate=venue(location,fieldInfo)'
   try:
    teams=fetch(source)['teams'];report={'league':name,'source':source,'teams':[]}
    for t in teams:
     if not t.get('active',True):continue
     v=t.get('venue',{});vid='mlb:'+str(v.get('id'));info=v.get('fieldInfo',{});location=v.get('location',{});coords=location.get('defaultCoordinates',{})
     entry={'id':str(t['id']),'name':t['name'],'venue':vid if v.get('name') else None,'source':source};report['teams'].append(entry)
     if not v.get('name'):continue
     r={'id':vid,'name':v['name'],'categories':['stadium','sports venue'],'city':location.get('city',''),'source':source,'capacity':info.get('capacity'),'teams':[{'id':'mlb:'+str(t['id']),'name':t['name'],'league':name}],'description':'MLB venue facts: roof '+info.get('roofType','unknown')+'; turf '+info.get('turfType','unknown')+'. Field distances are in feet, not meters: '+str({k:info[k] for k in ('leftLine','leftCenter','center','rightCenter','rightLine') if k in info})}
     if coords:r['coordinates']=[coords['latitude'],coords['longitude']]
     records[vid]=r
    reports.append(report);print(name,len(report['teams']),sum(t['venue'] is not None for t in report['teams']),flush=True);continue
   except Exception as e:errors.append({'league':name,'error':str(e)})
  url=f'https://site.api.espn.com/apis/site/v2/sports/{sport}/{code}/teams?limit=1000'
  try:teams=[r['team'] for r in fetch(url)['sports'][0]['leagues'][0]['teams'] if r['team'].get('isActive',True) and not r['team'].get('isAllStar')]
  except Exception as e:errors.append({'league':name,'error':str(e)});continue
  def detail(t):
   source=f'https://sports.core.api.espn.com/v2/sports/{sport}/leagues/{code}/teams/{t["id"]}'
   try:
    data=fetch(source);v=data.get('venue')
    if v and not v.get('fullName') and v.get('$ref'):v=fetch(v['$ref'].replace('http:','https:'))
    return t,v,source,None
   except Exception as e:return t,None,source,str(e)
  report={'league':name,'source':url,'teams':[]}
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
   for t,v,source,error in pool.map(detail,teams):
    entry={'id':t['id'],'name':t['displayName'],'venue':None,'source':source};report['teams'].append(entry)
    if error:entry['error']=error
    if not v or not v.get('fullName'):continue
    vid=f'espn:{sport}:{code}:{v["id"]}';vname=v['fullName'];city=v.get('address',{}).get('city','')
    # The ESPN franchise record still points to the former arena. The official
    # Clippers/Intuit Dome site is the primary source for this explicit correction.
    if sport=='basketball' and code=='nba' and t['id']=='12':vid='official:intuit-dome';vname='Intuit Dome';city='Inglewood';source='https://www.intuitdome.com/'
    r=records.setdefault(vid,{'id':vid,'name':vname,'categories':['sports venue','arena' if sport in ('basketball','hockey') else 'stadium'],'source':source,'city':city,'teams':[],'description':'Team-directory venue reference; footprint and facade dimensions not supplied. Directory links may be stale.'})
    r['teams'].append({'id':f'espn:{code}:{t["id"]}','name':t['displayName'],'league':name})
    if t.get('shortDisplayName'):r.setdefault('aliases',[]).append(t['shortDisplayName'])
    if vid=='official:intuit-dome':r.setdefault('aliases',[]).extend(['Los Angeles Clippers','Clippers'])
    entry['venue']=vid
  reports.append(report);print(name,len(teams),sum(t['venue'] is not None for t in report['teams']),flush=True)
 out=ROOT/'data/architecture'
 (out/'team-venues.json').write_text(json.dumps(list(records.values()),ensure_ascii=False,separators=(',',':'))+'\n')
 (out/'team-coverage.json').write_text(json.dumps({'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'leagues':reports,'failures':errors,'scope':'Public team-directory snapshot. Not a season-roster or venue certification. Missing links are explicit. Contains a cited official Intuit Dome correction.'},ensure_ascii=False,separators=(',',':'))+'\n')
 print('Venues',len(records),'errors',errors,flush=True)
if __name__=='__main__':main()
