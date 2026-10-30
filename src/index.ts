import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { MainAreaWidget } from '@jupyterlab/apputils';
import { ITerminal, ITerminalTracker } from '@jupyterlab/terminal';
import { Terminal } from '@jupyterlab/services';

import { scanOscUrls } from './osc';
import { sendNotification } from './request';

/**
 * Built-in JupyterLab command that opens a URL. Default behaviour opens the URL
 * as an in-lab iframe tab (never popup-blocked); `newBrowserTab: true` opens a
 * real browser tab via a bare window.open. We reuse it rather than call
 * window.open ourselves, which browsers popup-block when passed window features.
 */
const OPEN_COMMAND = 'help:open';

/**
 * Initialization data for the @stellarshenson/jupyterlab-xdg-open-url-extension extension.
 *
 * Watches every terminal's output for the invisible OSC 6789 marker emitted by
 * `jlab-xdg-open <url>`, then launches a notification (via
 * jupyterlab_notifications_extension, pushed instantly with `immediate: true`)
 * carrying an "Open" button that opens the URL via the built-in `help:open`.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@stellarshenson/jupyterlab-xdg-open-url-extension:plugin',
  description:
    'Turn a terminal xdg-open into a JupyterLab notification with an Open button.',
  autoStart: true,
  requires: [ITerminalTracker],
  activate: (app: JupyterFrontEnd, tracker: ITerminalTracker) => {
    console.log(
      'JupyterLab extension @stellarshenson/jupyterlab-xdg-open-url-extension is activated!'
    );

    const notify = async (url: string): Promise<void> => {
      try {
        await sendNotification(
          {
            message: `Open link from terminal: ${url}`,
            type: 'info',
            autoClose: false,
            immediate: true,
            actions: [
              {
                label: 'Open',
                caption: url,
                displayType: 'accent',
                commandId: OPEN_COMMAND,
                args: { url, text: url, newBrowserTab: true }
              }
            ]
          },
          app.serviceManager.serverSettings
        );
      } catch (err) {
        console.error('jlab-xdg-open: failed to send notification', err);
      }
    };

    // Attach an output listener to one terminal widget.
    const watch = (widget: MainAreaWidget<ITerminal.ITerminal>): void => {
      const session = widget.content.session;
      if (!session) {
        return;
      }

      // Per-session buffer so an OSC marker split across output chunks is
      // still reassembled (scanOscUrls carries the partial tail forward).
      let buffer = '';
      const onMessage = (
        _sender: Terminal.ITerminalConnection,
        msg: Terminal.IMessage
      ): void => {
        if (msg.type !== 'stdout' || !msg.content || msg.content.length === 0) {
          return;
        }
        buffer += String(msg.content[0]);
        const { urls, rest } = scanOscUrls(buffer);
        buffer = rest;
        urls.forEach(url => {
          void notify(url);
        });
      };

      session.messageReceived.connect(onMessage);
      widget.disposed.connect(() => {
        session.messageReceived.disconnect(onMessage);
        buffer = '';
      });
    };

    // Existing terminals plus any opened later.
    tracker.forEach(watch);
    tracker.widgetAdded.connect((_, widget) => watch(widget));
  }
};

export default plugin;
