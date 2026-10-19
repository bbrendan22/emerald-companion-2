import PokemonName from '../../../ui/components/PokemonName.js';
import {publicAsset} from '../../../assets/publicAsset.js';
import React, { useState, useRef, useCallback } from 'react'
import '../items.css'
import ItemAcquisition from './ItemAcquisition.jsx'
import { pokeBallCatchRates } from '../data/pokeBallCatchRates.js'
import { itemCategories, itemCategory, battleGroups, berryGroups, utilityGroups, miscGroups, itemDescription } from '../utils/itemCategories.js'
import { items, machines } from '../utils/itemEntries.js'
import { matchesItemSearch } from '../utils/itemSearch.js'
import ItemSummary from './ItemSummary.jsx'
import ItemDialog from './ItemDialog.jsx'
import { pokemonMeta } from '../data/pokemonMeta.js'
import { moveResources } from '../data/moveResources.js'
const pockets={ITEMS:'Items',KEY_ITEMS:'Key Items',POKE_BALLS:'Poké Balls',TM_HM:'TMs/HMs',BERRIES:'Berries'}


export default function ItemsBrowser({ initialCategory = 'Battle', berriesOnly = false, machinesOnly, initialEntry, onMove, onPokemon }) {
 const [activeItem,setActiveItem]=useState(null)
 const returnFocus=useRef(null)
 const closeItem=useCallback(()=>setActiveItem(null),[])
 const [search,setSearch]=useState('')
 const [filter,setFilter]=useState(berriesOnly?'Berries':machinesOnly?'TMs/HMs':initialCategory)
 const [selected,setSelected]=useState(initialEntry??null)
 const entries=[...items.filter(item=>item.pocket!=='TM_HM'),...machines]
 const matches=entries.filter(item=>matchesItemSearch(item,search)&&itemCategory(item)===filter)
 const groupDefinitions={Battle:battleGroups,Utility:utilityGroups,Berries:berryGroups,'Misc.':miscGroups}[filter]
 const groups=filter==='TMs/HMs'?['TM','HM'].map(prefix=>({name:prefix==='TM'?'TMs':'HMs',entries:matches.filter(item=>item.code.startsWith(prefix))})).filter(group=>group.entries.length):groupDefinitions?Object.entries(groupDefinitions).map(([name,ids])=>({name,entries:matches.filter(item=>ids.includes(Number(item.id)))})).filter(group=>group.entries.length):[{name:null,entries:matches}]
 const machine=selected?.machine?selected:machines.find(m=>m.code===selected?.name)
 return <div className="resource-items-page">
 {selected?<article className="resource-species">
 <div className="resource-species-hero"><span>EMERALD · {machine?machine.code:pockets[selected.pocket]??'ITEM'}</span><h2>{machine?`${machine.code} · ${machine.name}`:selected.name}</h2>{machine&&<div className="resource-types"><span>{moveResources[machine.moveId].type}</span></div>}</div>
 <section><h3>Effect</h3><p className="resource-effect-copy">{machine?moveResources[machine.moveId].description:itemDescription(selected)}</p>{machine&&<><p className="resource-note">{machine.code.startsWith('TM')?'Single-use TM in Emerald.':'Reusable HM in Emerald. HM moves require the Move Deleter to forget.'}</p><button className="resource-ability-link" onClick={()=>onMove(machine.moveId,selected)}>View {machine.name} move details →</button></>}</section>
 {!selected.machine&&<section><h3>Item Info</h3><dl><dt>Bag pocket</dt><dd>{pockets[selected.pocket]??selected.pocket}</dd><dt>Base price</dt><dd>{selected.price?`₽${selected.price.toLocaleString()}`:'Not normally sold'}</dd><dt>Held effect</dt><dd>{selected.held?'Yes':'No'}</dd></dl><p className="resource-note">Base price is game data, not a guarantee that a shop sells this item. Some defined items are unused or belong to other Gen III games.</p></section>}
 {pokeBallCatchRates[selected.id]&&<p className="resource-note resource-item-secondary">Catch rate · {pokeBallCatchRates[selected.id]}</p>}
 <ItemAcquisition itemId={machine?.id??selected.id}/>
 {machine&&<section><h3>Compatible Pokémon</h3><p className="resource-note">{machine.species.length} species · Emerald learnsets</p><div className="resource-pokemon-grid">{machine.species.map(id=>{const meta=pokemonMeta[id];return <button key={id} onClick={()=>onPokemon([String(id),meta],selected)}><span>#{String(meta.dex).padStart(3,'0')}</span><img loading="lazy" src={publicAsset(`/pokemon/emerald/normal/${meta.dex}.png`)} alt=""/><strong><PokemonName>{meta.name}</PokemonName></strong><small>{meta.types.join(' / ')}</small></button>})}</div></section>}
 <p className="resource-note">Explore Hoenn lists pickups, hidden items, and scripted gifts by location. Source: <a href="https://github.com/pret/pokeemerald/blob/master/src/data/items.h" target="_blank" rel="noreferrer">Emerald item data</a> and <a href="https://github.com/pret/pokeemerald/blob/master/src/data/pokemon/tmhm_learnsets.h" target="_blank" rel="noreferrer">TM/HM learnsets</a>.</p>
 </article>:<>
 <div className="resource-list-heading"><h1>{berriesOnly?'Berries':'Useful Items'}</h1></div>
 <div className="resources-search"><label className="resources-search-label" htmlFor="resources-items-query">Search items</label><div className="resources-search-field"><input id="resources-items-query" type="search" placeholder="Search" value={search} onChange={e=>setSearch(e.target.value)} autoComplete="off" spellCheck="false" /></div></div>
 {!berriesOnly&&<div className="resource-profile-tabs resource-item-tabs" role="tablist" aria-label="Item categories">{itemCategories.map(category=><button key={category} role="tab" aria-selected={filter===category} onClick={()=>setFilter(category)}>{category==='TMs/HMs'?<>TMs/<wbr/>HMs</>:category}</button>)}</div>}
 <div key={filter} className="resource-item-groups" tabIndex={0} aria-label="Items list">{groups.map(group=><section key={group.name??filter}>{group.name&&<h3>{group.name}</h3>}<div className="resource-moves-table resource-items-table">{group.entries.map(item=><div className="resource-expandable-entry resource-item-entry" key={item.code??item.id}><button className="resource-learnset-move resource-item-main" aria-haspopup="dialog" data-item-id={item.id} onClick={event=>{
 returnFocus.current=event.detail===0?event.currentTarget:null;setActiveItem(item.id)
}}><ItemSummary item={item}/></button></div>)}</div></section>)}</div>{!matches.length&&<p className="resource-empty">No results.</p>}

 </>}
 {activeItem!==null&&<ItemDialog itemId={activeItem} onClose={closeItem} returnFocus={returnFocus.current}/>}
 </div>
}
