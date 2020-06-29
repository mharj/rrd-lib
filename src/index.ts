import {EventEmitter} from 'typed-event-emitter';

interface IGraphSettings {
	name: string;
	count: number;
	step: number;
}

interface IProps {
	startTime?: Date;
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
	value: number | undefined;
	ts: Date;
}

export class Rrd extends EventEmitter {
	public onGraphUpdate = this.registerEvent<(name: string, data: IData) => void>();
	private data: IDataObject = {};
	private buffers: Record<string, IBufferData[]> = {};
	private startTime: Date;
	constructor(props: IProps) {
		super();
		this.startTime = props.startTime || new Date();
		props.graph.forEach((e) => {
			this.data[e.name] = {
				count: e.count,
				step: e.step,
				data: Array(e.count).fill(undefined),
			};
			this.buffers[e.name] = [];
		});
	}

	public set(value: number | undefined): void {
		const ts = this.flush();
		Object.keys(this.buffers).forEach((k) => {
			this.buffers[k].push({value, ts});
		});
	}

	public getData(name: string): DataPoint[] {
		const value = this.data[name];
		return [...value.data];
	}

	public flush(): Date {
		const ts = new Date();
		this.checkBufferSwap(ts);
		return ts;
	}

	private getNextPointDate(ts: Date, step: number) {
		return new Date(Math.ceil(ts.getTime() / step) * step);
	}

	/* 	private getCurrentPointDate(ts: Date, step: number) {
		return new Date(Math.floor(ts.getTime() / step) * step);
	} */

	private checkBufferSwap(ts: Date) {
		Object.keys(this.buffers).forEach((k) => {
			const buffer = this.buffers[k];
			if (buffer.length > 0) {
				const c = this.data[k];
				const last = this.getNextPointDate(buffer[buffer.length - 1].ts, c.step);
				if (ts > last) {
					this.purgeBuffer(k, last);
				}
			}
		});
	}

	private purgeBuffer(name: string, ts: Date) {
		const values = this.buffers[name].filter((e) => e.value !== undefined).map((e) => e.value) as number[];
		const pointData = {
			ts,
			avg:
				values.reduce((previousValue, currentValue) => {
					return previousValue + currentValue;
				}, 0) / values.length,
			min: Math.min(...values),
			max: Math.max(...values),
		};
		this.buffers[name] = [];
		const data = [...this.data[name].data];
		// handle data slot location
		// TODO: fix ordering and time elapse
		const loc = data.length - 1 - this.dataLocation(ts, this.data[name].step);
		console.log(loc);
		data[loc] = pointData;
		this.emit(this.onGraphUpdate, name, pointData);
		this.data[name].data = data;
	}

	private dataLocation(ts: Date, step: number): number {
		const currentTs = this.getNextPointDate(ts, step);
		const startTs = this.getNextPointDate(this.startTime, step);
		return Math.round((currentTs.getTime() - startTs.getTime()) / step);
	}
}
