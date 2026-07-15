import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

/**
 * URL namespace of the jupyterlab_notifications_extension server routes.
 * Display is delegated to that extension (this extension owns no server route).
 */
export const NOTIFICATIONS_NAMESPACE = 'jupyterlab-notifications-extension';

/**
 * Action button on a notification. `commandId` (+ optional `args`) is executed
 * by the notifications extension frontend when the button is clicked.
 */
export interface INotificationAction {
  label: string;
  caption?: string;
  displayType?: 'default' | 'accent' | 'warn' | 'link';
  commandId?: string;
  args?: Record<string, unknown>;
}

/**
 * Payload accepted by the notifications ingest endpoint.
 * `immediate: true` is the `--now` flag: push over WebSocket for instant display.
 */
export interface INotificationPayload {
  message: string;
  type?: 'default' | 'info' | 'success' | 'warning' | 'error' | 'in-progress';
  autoClose?: number | false;
  immediate?: boolean;
  actions?: INotificationAction[];
}

/**
 * POST a notification to the jupyterlab_notifications_extension ingest endpoint.
 *
 * @param payload The notification body
 * @param serverSettings The lab server settings (carries base URL and token)
 */
export async function sendNotification(
  payload: INotificationPayload,
  serverSettings: ServerConnection.ISettings
): Promise<void> {
  const requestUrl = URLExt.join(
    serverSettings.baseUrl,
    NOTIFICATIONS_NAMESPACE,
    'ingest'
  );

  let response: Response;
  try {
    response = await ServerConnection.makeRequest(
      requestUrl,
      { method: 'POST', body: JSON.stringify(payload) },
      serverSettings
    );
  } catch (error) {
    throw new ServerConnection.NetworkError(error as any);
  }

  if (!response.ok) {
    const data = await response.text();
    throw new ServerConnection.ResponseError(response, data);
  }
}
