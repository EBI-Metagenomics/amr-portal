import { Signal } from 'signal-polyfill';

type ActionView = 'download' | 'clear' | null;

const actionView = new Signal.State<ActionView>(null);

const setActionView = (view: ActionView) => {
  actionView.set(view);
};

export {
  actionView,
  setActionView
};