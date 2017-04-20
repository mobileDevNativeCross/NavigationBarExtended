/* eslint-disable */
import React, { Component, PropTypes } from 'react';

import NavigatorNavigationBarStylesAndroid from './NavigatorNavigationBarStylesAndroid';
import NavigatorNavigationBarStylesIOS from './NavigatorNavigationBarStylesIOS';
const Platform = require('Platform');
const StyleSheet = require('StyleSheet');
const View = require('View');
const Text = require('Text');
const guid = require('guid');
const { Map } = require('immutable');

const COMPONENT_NAMES = ['LeftButton', 'Title', 'SearchButton', 'RightButton'];

const NavigatorNavigationBarStyles = Platform.OS === 'android' ?
  NavigatorNavigationBarStylesAndroid : NavigatorNavigationBarStylesIOS;

const navStatePresentedIndex = (navState) => {
  if (navState.presentedIndex !== undefined) {
    return navState.presentedIndex;
  }

  return navState.observedTopOfStack;
};

class NavigationBar extends Component {
  static propTypes = {
    navigator: PropTypes.object,
    routeMapper: PropTypes.shape({
      Title: PropTypes.func.isRequired,
      LeftButton: PropTypes.func.isRequired,
      SearchButton: PropTypes.func.isRequired,
      RightButton: PropTypes.func.isRequired,
      Style: PropTypes.func.isRequired,
    }).isRequired,
    navState: PropTypes.shape({
      routeStack: PropTypes.arrayOf(PropTypes.object),
      presentedIndex: PropTypes.number,
    }),
    navigationStyles: PropTypes.object,
  };

  static Styles = NavigatorNavigationBarStyles;
  static StylesAndroid = NavigatorNavigationBarStylesAndroid;
  static StylesIOS = NavigatorNavigationBarStylesIOS;

  static defaultProps = {
    navigationStyles: NavigatorNavigationBarStyles,
  };

  componentWillMount() {
    this._reset();
  }

  /**
   * Stop transtion, immediately resets the cached state and re-render the
   * whole view.
   */
  immediatelyRefresh = () => {
    this._reset();
    this.forceUpdate();
  };

  _reset = () => {
    this._key = guid();
    this._reusableProps = {};
    this._components = {};
    this._descriptors = {};

    COMPONENT_NAMES.forEach((componentName) => {
      this._components[componentName] = new Map();
      this._descriptors[componentName] = new Map();
    });
  };

  _getReusableProps = (componentName: String, index: Number) => {
    let propStack = this._reusableProps[componentName];
    if (!propStack) {
      propStack = this._reusableProps[componentName] = [];
    }
    let props = propStack[index];
    if (!props) {
      props = propStack[index] = { style: {} };
    }
    return props;
  };

  _updateIndexProgress = (
    /* number */ progress,
    /* number */ index,
    /* number */ fromIndex,
    /* number */ toIndex,
  ) => {
    let amount = toIndex > fromIndex ? progress : (1 - progress);
    let oldDistToCenter = index - fromIndex;
    let newDistToCenter = index - toIndex;
    let interpolate;
    if (oldDistToCenter > 0 && newDistToCenter === 0 ||
        newDistToCenter > 0 && oldDistToCenter === 0) {
      interpolate = this.props.navigationStyles.Interpolators.RightToCenter;
    } else if (oldDistToCenter < 0 && newDistToCenter === 0 ||
               newDistToCenter < 0 && oldDistToCenter === 0) {
      interpolate = this.props.navigationStyles.Interpolators.CenterToLeft;
    } else if (oldDistToCenter === newDistToCenter) {
      interpolate = this.props.navigationStyles.Interpolators.RightToCenter;
    } else {
      interpolate = this.props.navigationStyles.Interpolators.RightToLeft;
    }
    COMPONENT_NAMES.forEach(function (componentName) {
      let component = this._components[componentName].get(this.props.navState.routeStack[index]);
      let props = this._getReusableProps(componentName, index);
      if (component && interpolate[componentName](props.style, amount)) {
        props.pointerEvents = props.style.opacity === 0 ? 'none' : 'box-none';
        component.setNativeProps(props);
      }
    }, this);
  };

  updateProgress = (/*number*/progress, /*number*/fromIndex, /*number*/toIndex) => {
    let max = Math.max(fromIndex, toIndex);
    let min = Math.min(fromIndex, toIndex);
    for (let index = min; index <= max; index++) {
      this._updateIndexProgress(progress, index, fromIndex, toIndex);
    }
  };

  render() {
    let navBarStyle = {
      height: this.props.navigationStyles.General.TotalNavHeight,
    };
    let navState = this.props.navState;
    let components = navState.routeStack.map((route, index) =>
      COMPONENT_NAMES.map(componentName =>
        this._getComponent(componentName, route, index)
      )
    );

    let navStyle = navState.routeStack.map((route, index) =>
      this._getStyle(route, index)
    );
    let navIndex = navState.routeStack.length - 1;
    let navigationBarStyle = navStyle[navIndex];
    let style = [styles.navBarContainer, navBarStyle, navigationBarStyle /* , { flexDirection: 'row'} */];
    if (navState.routeStack[0].name === 'initial') {
      style = {};
    } else {

    }
    return (
      <View
        key={this._key}
        style={style}
      >
        {components}
      </View>
    );
  }


  _getStyle = (/*object*/route, /*number*/index) => {
    const componentName = 'Style';

    let content = this.props.routeMapper[componentName](
      this.props.navState.routeStack[index],
      this.props.navigator,
      index,
      this.props.navState,
    );

    return content;
  };

  _getComponent = (/*string*/componentName, /*object*/route, /*number*/index) => /*?Object*/ {
    if (this._descriptors[componentName].includes(route)) {
      return this._descriptors[componentName].get(route);
    }

    let rendered = null;

    let content = this.props.routeMapper[componentName](
      this.props.navState.routeStack[index],
      this.props.navigator,
      index,
      this.props.navState
    );
    if (!content) {
      return null;
    }

    let componentIsActive = index === navStatePresentedIndex(this.props.navState);
    let initialStage = componentIsActive ?
      this.props.navigationStyles.Stages.Center :
      this.props.navigationStyles.Stages.Left;
    rendered = (
      <View
        ref={(ref) => {
          this._components[componentName] = this._components[componentName].set(route, ref);
        }}
        pointerEvents={componentIsActive ? 'box-none' : 'none'}
        style={[initialStage[componentName], { paddingRight: componentName === 'RightButton' ? 16 : 0 }]}>
        {content}
      </View>
    );

    this._descriptors[componentName] = this._descriptors[componentName].set(route, rendered);
    return rendered;
  };
}

let styles = StyleSheet.create({
  navBarContainer: {
    // position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 1.2,
  },
});

export default NavigationBar;
