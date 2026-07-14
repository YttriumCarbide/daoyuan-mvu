import headerHtml from './html/header.html?raw';
import contentGridHtml from './html/content_grid.html?raw';
import modalsHtml from './html/modals.html?raw';

const mHeader = document.getElementById('header-mount');
if (mHeader) mHeader.outerHTML = headerHtml;

const mContentGrid = document.getElementById('content-grid-mount');
if (mContentGrid) mContentGrid.outerHTML = contentGridHtml;

const mModals = document.getElementById('modals-mount');
if (mModals) mModals.outerHTML = modalsHtml;
