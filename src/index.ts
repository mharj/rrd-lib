import * as EventEmitter from 'eventemitter3';

interface IGraphSettings {
	name: string;
	count: number;
	step: number;
}

interface IProps {
	graph: IGraphSettings[];
}

interface IData {
	avg: number;
	min: number;
	max: number;
	ts: Date;
}

type DataPoint = IData | undefined;

interface IDataSet {
	count: number;
	step: number;
	data: DataPoint[];
}

type IDataObject = Record<string, IDataSet>;

interface IBufferData {
	value: number;
	ts: Date;
}

export class Rrd extends EventEmitter {
	private data: IDataObject = {};
	private buffer: Record<string, IBufferData[]> = {};
	constructor(props: IProps) {
		super();
		props.graph.forEach((e) => {
			this.data[e.name] = {
				count: e.count,
				step: e.step,
				data: Array.apply(null, {length: e.count}).map(function () {
					return undefined;
				}),
			};
			this.buffer[e.name] = [];
		});
	}
	public set(value: number) {
		const ts = new Date();
		this.checkBufferSwap(ts);
		Object.keys(this.buffer).forEach((k) => {
			this.buffer[k].push({value, ts});
		});
	}
	public getData(name: string): DataPoint[] {
		const value = this.data[name];
		return [...value.data];
	}
	public flush() {
		const ts = new Date();
		this.checkBufferSwap(ts);
	}
	private getNextPointDate(ts: Date, step: number) {
		return new Date(Math.ceil(ts.getTime() / step) * step);
	}
	private checkBufferSwap(ts: Date) {
		Object.keys(this.buffer).forEach((k) => {
			const buffer = this.buffer[k];
			if (buffer.length > 0) {
				const c = this.data[k];
				const last = this.getNextPointDate(buffer[buffer.length - 1].ts, c.step);
				if (ts > last) {
					this.purgeBuffer(k, last);
				}
			}
		});
	}
	private purgeBuffer(name:string, ts: Date) {
		const values = this.buffer[name].map((e) => e.value);
		this.buffer[name] = [];

		const data = [...this.data[name].data];
		data.shift();
		data.push({
			ts,
			avg:
				values.reduce((previousValue, currentValue) => {
					return previousValue + currentValue;
				}, 0) / values.length,
			min: Math.min(...values),
			max: Math.max(...values),
		});
		this.data[name].data = data;
	}
}
