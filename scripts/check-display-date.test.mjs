import test from 'node:test';
import assert from 'node:assert/strict';
import {displayDate} from '../lib/display-date.ts';
test('calendar due dates never shift to the previous day in Brazil',()=>{assert.equal(displayDate('2026-10-26'),'26/10/2026');assert.equal(displayDate('2028-02-29'),'29/02/2028');});
test('timestamps use Brasília and old SQLite UTC timestamps do not depend on browser locale',()=>{for(const value of ['2026-10-26T02:30:00Z','2026-10-26 02:30:00','2026-10-26T02:30:00'])assert.match(displayDate(value,true),/25\/10\/2026.*23:30/);assert.match(displayDate('2026-10-26T00:30:00-03:00',true),/26\/10\/2026.*00:30/);});
test('seconds and milliseconds are explicit so access/trial dates cannot be rendered as 1970 accidentally',()=>{const seconds=Date.parse('2026-10-26T15:00:00Z')/1000;assert.equal(displayDate(seconds,false,'seconds'),'26/10/2026');assert.equal(displayDate(seconds*1000),'26/10/2026');});
test('invalid, impossible or ambiguous dates never crash a page or invent a deadline',()=>{for(const value of [null,undefined,'','bad-date','26/10/2026','2026-02-30','2026-02-30T10:00:00Z',Infinity,NaN])assert.equal(displayDate(value),'Não informado');assert.equal(displayDate(null,true,'milliseconds','Ainda sem pedido'),'Ainda sem pedido');});
