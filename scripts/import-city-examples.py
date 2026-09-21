#!/usr/bin/env python3
"""Find a named building directly assigned to each indexed city in Wikidata.
Missing records remain explicit; a city name alone never becomes an example.
"""
import datetime,importlib.util,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('architecture_import',ROOT/'scripts/import-architecture-references.py');api=importlib.util.module_from_spec(spec);spec.loader.exec_module(api)
def main():
 cities=json.loads((ROOT/'data/architecture/cities.json').read_text());byid={c['id']:c for c in cities};records={};failures=[];covered=set()
 for start in range(0,len(cities),100):
  values=' '.join(json.dumps(c['id']) for c in cities[start:start+100])
  q=f'''SELECT ?city ?geo ?item ?itemLabel ?coord WHERE {{
    {{SELECT ?city ?geo (SAMPLE(?building) AS ?item) WHERE {{
      hint:Query hint:optimizer "None". VALUES ?geo {{{values}}} ?city wdt:P1566 ?geo.
      ?building wdt:P131 ?city. VALUES ?kind {{wd:Q41176 wd:Q11303 wd:Q11755880 wd:Q483110 wd:Q641226}}
      ?building wdt:P31 ?kind. FILTER NOT EXISTS {{?building wdt:P576 ?demolished}}
    }} GROUP BY ?city ?geo}}
    OPTIONAL{{?item wdt:P625 ?coord}} {api.LABELS.replace('en','en,mul')}
  }}'''
  try:rows=api.query(f'city examples {start}/{len(cities)}',q)
  except Exception as e:failures.append({'offset':start,'error':str(e)});print('FAILED',start,e,flush=True);continue
  for row in rows:
   id=api.qid(row['item']);geo=row['geo'];name=row['itemLabel']
   if name==id:continue
   city=byid[geo];key='city:'+geo+':'+id
   records[key]={'id':key,'wikidataId':id,'name':name,'categories':['building'],'city':city['name'],'cityId':geo,'source':'https://www.wikidata.org/wiki/'+id,'description':'Building assigned directly to the city in Wikidata (administrative-location relation). Form and dimensions not supplied; verify any geometry assumptions.'}
   covered.add(geo)
 out=ROOT/'data/architecture'
 (out/'city-examples.json').write_text(json.dumps(list(records.values()),ensure_ascii=False,separators=(',',':'))+'\n')
 (out/'city-example-coverage.json').write_text(json.dumps({'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'indexedCities':len(cities),'citiesWithDirectExamples':len(covered),'cityIdsWithDirectExamples':sorted(covered),'failures':failures,'scope':'One named building sample per city where a direct Wikidata administrative-location relation exists. Incomplete; not municipal-boundary geometry, not an architectural survey.'},ensure_ascii=False,separators=(',',':'))+'\n')
 print('Direct city examples',len(records),'failures',failures,flush=True)
if __name__=='__main__':main()
