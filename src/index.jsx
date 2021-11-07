import React, { useState, useCallback, useMemo, useReduce } from 'react';
import ReactDOM from 'react-dom';
import {makeAutoObservable, runInAction, action, autorun} from 'mobx';
import {observer} from 'mobx-react';
import DatePicker from "react-datepicker";
import {sub, format} from 'date-fns';

import "react-datepicker/dist/react-datepicker.css";

class Item {
	constructor(){
		this.name = '';
		this.duration = '';
		this.id = `${new Date().valueOf()}-${Math.round(Math.random() * 10000)}`;
		makeAutoObservable(this);
	}
	
	get durationParsed(){
		const durationText = this.duration;
		const matches = [...durationText.matchAll(/(\d+)\s+(year|yr|month|min|day|dy|hour|hr|minute|min|second|sec)s?/g)];
		const res = {};
		matches.forEach(match => {
			let [,amount,type] = match;
			
			amount = Number(amount);
			if(type === 'year' || type === 'yr'){
				res.years = amount;
			}
			else if(type === 'month' || type === 'mon'){
				res.months = amount;
			}
			else if(type === 'day' || type == 'dy'){
				res.days = amount;
			}
			else if(type === 'hour' || type === 'hr'){
				res.hours = amount;
			}
			else if(type === 'minute' || type === 'min'){
				res.minutes = amount;
			}
			else if(type === 'second' || type === 'sec'){
				res.seconds = amount;
			}
		});
		
		return res;
	}
}

class Model {
	constructor(){
		this.startTime = new Date();
		this.items = [];
		makeAutoObservable(this, {}, {
			autoBind: true
		});
		
		this.load();
		
		autorun(() => {
			this.save();
		});
	}
	
	load(){
		const val = localStorage.getItem('save');
		if(!val)return;
		try {
			const json = JSON.parse(val);
			this.startTime = new Date(json.startTime);
			this.items = json.items.map(item => {
				const instance = new Item();
				instance.id = item.id;
				instance.name = item.name;
				instance.duration = item.duration;
				return instance;
			});
		}
		catch(e){
			console.warn(e);
		}
	}
	
	save(){
		localStorage.setItem('save', JSON.stringify(this));
	}
	
	get adjustedTimes(){
		const res = {};
		let dateTime = this.startTime;
		
		this.items.forEach(item => {
			const b = sub(dateTime,item.durationParsed);
			res[item.id] = b;
			dateTime = b;
		});
		
		return res;
	}
	
	moveTo(item, pos){
		const items = [...this.items];
		const originalPos = items.indexOf(item);
		items.splice(originalPos, 1);
		items.splice(pos, 0, item);
		this.items = items;
	}
	
	moveUp(item){
		const pos = this.items.indexOf(item);
		this.moveTo(item, pos + 1);
	}
	
	moveDown(item){
		const pos = this.items.indexOf(item);
		this.moveTo(item, pos - 1);
	}
	
	addItem(){
		this.items.push(new Item());
	}
	
	removeItem(item){
		const index = this.items.indexOf(item);
		if(index != -1){
			this.items.splice(index, 1);
		}
	}
}

const useFormState = (target, property) => {
	const onChange = useCallback((e) => {
		runInAction(() => {
			if('target' in e){
				target[property] = e.target.value;
			}
			else {
				target[property] = e;
			}
		});
	}, [target, property]);
	
	return {
		value: target[property],
		onChange
	};
}

const model = new Model();

const ExampleCustomInput = React.forwardRef(({ value, onClick }, ref) => (
	<input type="text" id="endTime" className="form-control" onClick={onClick} ref={ref} value={value} readOnly/>
  ));

const ItemView = observer(({item,adjustedTime,moveUp,moveDown,remove}) => {
	const nameProps = useFormState(item, 'name');
	const durationProps = useFormState(item, 'duration');
	
	const formatted = useMemo(() => {
		if(!adjustedTime){
			return '';
		}
		return format(adjustedTime, 'MMM do, h:mm aaa');
	},[adjustedTime]);
	
	const handleMoveUp = useCallback(() => {
		moveUp(item);
	}, [moveUp, item]);
	
	const handleMoveDown = useCallback(() => {
		moveDown(item);
	}, [moveDown, item]);
	
	const handleRemove = useCallback(() => {
		remove(item);
	}, [remove, item]);
	
	const nameId = `${item.id}-name`;
	const durationId = `${item.id}-duration`;
	
	return (<div className="row gy-3">
		<div className="col-auto">
			<div className="form-floating">
			  <input className="form-control " id={nameId} placeholder="Name" {...nameProps} />
			  <label htmlFor={nameId}>Name</label>
			</div>
		</div>
		<div className="col-auto">
			<div className="form-floating">
			  <input className="form-control" id={durationId} placeholder="Duration" {...durationProps} />
			  <label htmlFor={durationId}>Duration</label>
			</div>
		</div>
		<div className="col-auto me-auto align-self-center">
			{formatted}
		</div>
		<div className="col-auto align-self-center">
			<div className="btn-group me-2" role="group">
				<button className="btn btn-primary lh1" onClick={handleMoveUp}><span className="material-icons">expand_more</span></button>
				<button className="btn btn-primary lh1" onClick={handleMoveDown}><span className="material-icons">expand_less</span></button>
				<button className="btn btn-danger lh1" onClick={handleRemove}><span className="material-icons">close</span></button>
			</div>
		</div>
	</div>);
});

const App = observer(() => {
	const startTimeProps = useFormState(model, 'startTime');
	const adjustedTimes = model.adjustedTimes;
	
	return <div className="container" style={{marginTop: '1em'}}>
		<div className="row gy-3">
			<div className="col-12">
				<h1>Timing Calculator</h1>
			</div>
			<div className="col-12">
				<p>
					A simple app that takes an end time, and a set of events + durations to determine how much time you have to do things.
				</p>
				<p>
					An example would be that you need to be somewhere by a cetian time, and you have things you need to do prior to leaving.
					You can set the arrival time as the &quot;End Time&quote;, add an item and set the duration to the travel time. Add another item
					for getting ready to leave and set the duration. The time displayed next to the last item is the time you need to do that thing in
					order to be on time.
				</p>
				<strong>Directions</strong>
				<ol>
					<li>Select the end date/time.</li>
					<li>Click &quot;Add Item&quot;</li>
					<li>Fill in the &quot;Duration&quot; field with a duration. Natural english is detected. Eg: &quot;1 hour 3 minute&quot;</li>
					<li>A time will be shown that subtracts the duration from the end time.</li>
					<li>Repeat.</li>
				</ol>
			</div>
		</div>
		<div className="row gy-3">
			<div className="col-12">
				<label htmlFor="endTime" className="form-label">End Time</label>
				<DatePicker
					selected={startTimeProps.value}
					onChange={startTimeProps.onChange}
					customInput={<ExampleCustomInput />}
					showTimeSelect
					dateFormat="ccc MMM do, h:mm aaa"/>
			</div>
		</div>
		{
			model.items.map((item) => <ItemView
				key={item.id}
				item={item}
				adjustedTime={adjustedTimes[item.id]}
				moveUp={model.moveUp}
				moveDown={model.moveDown}
				remove={model.removeItem}
				/>)
		}
		<div className="row gy-3">
			<div className="col-12">
				<button onClick={model.addItem} className="btn btn-primary col-12">Add Item</button>
			</div>
		</div>
		<div className="row gy-3">
			<a href="https://github.com/kkirby/time-budget-calculator" target="_BLANK" style={{fontSize:'0.8em'}}>source on github</a>
		</div>
	</div>;
});

ReactDOM.render(
	<App />,
	document.getElementById('App')
);