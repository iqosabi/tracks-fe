import test from 'node:test';
import assert from 'node:assert/strict';
import {filterReadableRows,paginationMeta} from '../src/data-table.js';
import {table} from '../src/presentation.js';
test('numbering uses the server page offset while actions retain source indexes',()=>{const html=table([{username:'Two'}],'users',{offset:25,rowIndex:()=>7,actions:(row,index)=>`<button data-source="${index}">Ubah</button>`});assert.match(html,/>26<\/td>/);assert.match(html,/data-source="7"/);});
test('search uses readable fields and excludes UUIDs and token metadata',()=>{const rows=[{id:'private-uuid',username:'Andi',tokenHash:'private-token'},{username:'Budi'}];assert.deepEqual(filterReadableRows(rows,'users','Budi').map(x=>x.index),[1]);assert.equal(filterReadableRows(rows,'users','private').length,0);});
test('readable byte values and translated statuses are searchable',()=>{assert.equal(filterReadableRows([{totalBytes:'1073741824'}],'usage','1 GB').length,1);assert.equal(filterReadableRows([{status:'ACTIVE'}],'vehicles','Beroperasi').length,1);});
test('pagination respects metadata without inventing totals',()=>{assert.deepEqual(paginationMeta({pagination:{total:53,totalPages:3}},2,25,25),{total:53,totalPages:3,hasNext:true});assert.deepEqual(paginationMeta({},1,25,25),{total:null,totalPages:null,hasNext:true});assert.equal(paginationMeta({},2,25,3).hasNext,false);assert.equal(paginationMeta({total:0},1,25,0).totalPages,1);});
