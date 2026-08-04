// Market WebSocket client — experimental (stub)
export class MarketWebSocket {
  private _connected = false;
  get connected() { return this._connected; }
  connect() { this._connected = true; }
  disconnect() { this._connected = false; }
  on(_event: string, _cb: (data: unknown) => void) {}
}
