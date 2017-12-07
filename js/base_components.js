'use strict';

var Checkbox = React.createClass({
    displayName: "Checkbox",

    render: function render() {
        return React.createElement(
            "div",
            { className: "checkbox" },
            React.createElement(
                "label",
                null,
                React.createElement("input", {
                    type: "checkbox",
                    name: this.props.name,
                    checked: this.props.value === 1 ? true : false,
                    onChange: this.handleChange
                }),
                React.createElement(
                    "span",
                    { className: this.props.notInSync ? "not-in-sync" : "" },
                    chrome.i18n.getMessage(this.props.label)
                )
            )
        );
    },
    handleChange: function handleChange(e) {
        this.props.onChange(e.target.name, e.target.checked ? 1 : 0);
    }
});

var Select = React.createClass({
    displayName: "Select",

    render: function render() {
        return React.createElement(
            "div",
            { className: "select" },
            React.createElement(
                "label",
                null,
                React.createElement(
                    "select",
                    {
                        name: this.props.name,
                        value: this.props.notInSync ? -1 : this.props.value,
                        onChange: this.handleChange
                    },
                    React.createElement("option", { className: "hidden", disabled: true, selected: true, value: "-1" }),
                    this.props.options.map(function (option) {
                        return React.createElement(
                            "option",
                            { value: option.value },
                            option.label
                        );
                    })
                ),
                React.createElement(
                    "span",
                    { className: this.props.notInSync ? "not-in-sync" : "" },
                    chrome.i18n.getMessage(this.props.label)
                )
            )
        );
    },
    handleChange: function handleChange(e) {
        this.props.onChange(e.target.name, parseInt(e.target.value));
    }
});

var Number = React.createClass({
    displayName: "Number",

    render: function render() {
        return React.createElement(
            "div",
            { className: "number" },
            React.createElement(
                "label",
                null,
                React.createElement(InputRange, {
                    name: this.props.name,
                    step: this.props.step,
                    minValue: this.props.min,
                    maxValue: this.props.max,
                    value: this.props.notInSync ? null : this.getDisplayValue(),
                    labelSuffix: this.props.suffix,
                    onChange: this.handleChange
                }),
                React.createElement(
                    "span",
                    { className: this.props.notInSync ? "not-in-sync label" : "label" },
                    chrome.i18n.getMessage(this.props.label)
                )
            )
        );
    },
    handleChange: function handleChange(component, value) {
        var value = parseInt(value);
        if (this.props.offset && this.props.factor) {
            value = Math.floor((value - this.props.offset) / this.props.factor);
        }

        this.props.onChange(component.props.name, value);
    },
    getDisplayValue: function getDisplayValue() {
        if (this.props.offset && this.props.factor) {
            return this.props.factor * this.props.value + this.props.offset;
        }

        return this.props.value;
    }
});