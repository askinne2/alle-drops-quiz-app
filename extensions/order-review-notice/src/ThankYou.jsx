import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { ReviewNotice } from './ReviewNotice.jsx';

export default async () => {
  render(<ReviewNotice />, document.body);
};
