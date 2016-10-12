'use strict';

var Checkbox = React.createClass({
    render: function() {
        return (
            <div className="checkbox">
                <label>
                    <input
                        type="checkbox"
                        name={this.props.name}
                        checked={this.props.value === 1 ? true : false}
                        onChange={this.handleChange}
                    />
                    <span className={this.props.notInSync ? "not-in-sync" : ""}>{chrome.i18n.getMessage(this.props.label)}</span>
                </label>
            </div>
        );
    },
    handleChange: function(e) {
        this.props.onChange(e.target.name, e.target.checked ? 1 : 0);
    }
});

var Select = React.createClass({
    render: function() {
        return (
            <div className="select">
                <label>
                    <select
                        name={this.props.name}
                        value={this.props.notInSync ? -1 : this.props.value}
                        onChange={this.handleChange}
                    >
                        <option className="hidden" disabled selected value="-1" />
                        {
                            this.props.options.map(option => <option value={option.value}>{option.label}</option>)
                        }
                    </select>
                    <span className={this.props.notInSync ? "not-in-sync" : ""}>{chrome.i18n.getMessage(this.props.label)}</span>
                </label>
            </div>
        );

    },
    handleChange: function(e) {
        this.props.onChange(e.target.name, parseInt(e.target.value));
    }
});

var Number = React.createClass({
    render: function() {
        return (
            <div className="number">
                <label>
                    <InputRange
                        name={this.props.name}
                        step={this.props.step}
                        minValue={this.props.min}
                        maxValue={this.props.max}
                        value={this.props.notInSync ? null : this.getDisplayValue()}
                        labelSuffix={this.props.suffix}
                        onChange={this.handleChange}
                    />
                    <span className={this.props.notInSync ? "not-in-sync label" : "label"}>{chrome.i18n.getMessage(this.props.label)}</span>
                </label>
            </div>
        );
    },
    handleChange: function(component, value) {
        var value = parseInt(value);
        if (this.props.offset && this.props.factor) {
            value = Math.floor((value - this.props.offset) / this.props.factor);
        }

        this.props.onChange(component.props.name, value);
    },
    getDisplayValue: function() {
        if (this.props.offset && this.props.factor) {
            return this.props.factor * this.props.value + this.props.offset;
        }

        return this.props.value;
    }
});
