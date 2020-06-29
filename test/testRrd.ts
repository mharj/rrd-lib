/* eslint-disable import/first */
process.env.NODE_ENV = 'testing';
import {expect} from 'chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import 'mocha';
import {Rrd} from '../src/';
// tslint:disable: no-unused-expression
chai.use(chaiAsPromised);

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextDate(ts: Date, ms: number) {
	return new Date(Math.ceil(ts.getTime() / ms) * ms);
}
function waitNext(ms: number) {
	const now = new Date();
	const next = nextDate(now, ms);
	const diff = next.getTime() - now.getTime();
	return sleep(diff);
}

describe('rrd', () => {
	it('run run two graphs', async () => {
		await waitNext(100);
		const rrd = new Rrd({
			graph: [
				{name: 'test', count: 10, step: 100},
				{name: 'test2', count: 20, step: 100},
			],
		});
		// run data
		rrd.set(1);
		await sleep(1);
		rrd.set(2);
		await sleep(1);
		rrd.set(3);
		await sleep(1);
		rrd.set(undefined);
		// sleep
		await sleep(200);
		rrd.flush();
		rrd.set(2);
		await sleep(100);
		// flush buffer
		rrd.flush();
		const data = rrd.getData('test');
		expect(data.length).to.be.equal(10);
		expect(data.filter((e) => e !== undefined).length).to.be.equal(2);
		const data2 = rrd.getData('test2');
		expect(data2.length).to.be.equal(20);
		expect(data2.filter((e) => e !== undefined).length).to.be.equal(2);
	});
});
