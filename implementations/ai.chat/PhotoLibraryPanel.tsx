import React,{useState} from 'react';
import {PhotoReference,photoLibrary,photoThumbnail} from './photo-library';

export function PhotoLibraryPanel({busy,enabled,onEnabled,selected,onSelect}:{busy:boolean;enabled:boolean;onEnabled:(value:boolean)=>void;selected:PhotoReference|null;onSelect:(photo:PhotoReference|null)=>void}) {
  const [query,setQuery]=useState(''),[photos,setPhotos]=useState<PhotoReference[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[count,setCount]=useState<number|null>(null),[searched,setSearched]=useState(false);
  async function search(){if(!query.trim()||loading)return;setLoading(true);setError('');try{const [results,stats]=await Promise.all([photoLibrary().search(query),photoLibrary().stats()]);setPhotos(results);setCount(stats.photoCount);setSearched(true);}catch(e){setError(e instanceof Error?e.message:'Photo search failed. Retry when connected.');}finally{setLoading(false);}}
  return <section className="photo-library" aria-label="Photo reference library">
    <label className="photo-mode"><input type="checkbox" checked={enabled} disabled={busy} onChange={e=>onEnabled(e.target.checked)}/> Find a photo for new buildings</label>
    <p>Optional. Photo modeling needs Photo AI or a local vision model. Leave photo search off to create from your description.</p>
    <label htmlFor="photo-search">Search building photos</label>
    <div className="photo-search"><input id="photo-search" value={query} disabled={busy||loading} placeholder="Allianz Arena, Burj Khalifa…" onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();void search();}}}/><button disabled={busy||loading||!query.trim()} onClick={()=>void search()}>{loading?'Searching…':'Find'}</button></div>
    {count!==null&&<small>{count.toLocaleString()} photo records · images load on demand</small>}
    {error&&<p role="alert">{error}</p>}
    {searched&&!photos.length&&!error&&<p role="status">No matching photos. Try the building’s name or a type such as “stadium”.</p>}
    <div className="photo-results">{photos.map(photo=><PhotoTile key={photo.id} photo={photo} disabled={busy} selected={selected?.id===photo.id} onSelect={()=>onSelect(photo)}/>)}</div>
    {selected&&<div className="photo-selected"><span>Reference: {selected.landmark}</span><button disabled={busy} onClick={()=>onSelect(null)}>Clear photo</button></div>}
    <small>Photos: Wikimedia contributors. Labels: Google Landmarks v2, CC BY 4.0. Each photo links to its source and credit.</small>
  </section>;
}
function PhotoTile({photo,disabled,selected,onSelect}:{photo:PhotoReference;disabled:boolean;selected:boolean;onSelect:()=>void}){
  const [failed,setFailed]=useState(false);
  return <figure className="photo-tile">
    <button disabled={disabled||failed} aria-pressed={selected} aria-label={`Use photo of ${photo.landmark}`} onClick={onSelect}>
      {failed?<span className="photo-unavailable">Photo unavailable</span>:<img loading="lazy" src={photoThumbnail(photo.url)} alt={photo.title.replace(/^File:/,'')} onError={()=>setFailed(true)}/>}
      <span>{photo.landmark}</span>
    </button>
    <figcaption><a href={photo.source} target="_blank" rel="noreferrer">Source and license</a><details><summary>Photo credit</summary><p>{photo.author} · {photo.license}</p></details></figcaption>
  </figure>;
}
