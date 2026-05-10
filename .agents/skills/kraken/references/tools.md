# Kraken Tools Reference

## Market Data (no auth required)

### get_ticker
Get current price info for a trading pair.
- `pair` (required): Trading pair, e.g. `XBTUSD`, `ETHUSD`, `SOLUSD`
- Returns: ask/bid price, last trade, 24h volume, high/low, opening price

### get_orderbook
Get order book depth.
- `pair` (required): Trading pair
- `count` (optional): Max asks/bids per side (1-500, default 10)
- Returns: arrays of `{price, volume, timestamp}` for asks and bids

### get_ohlc
Get OHLC candlestick data.
- `pair` (required): Trading pair
- `interval` (optional): Minutes: 1, 5, 15, 30, 60, 240, 1440, 10080, 21600
- `since` (optional): UNIX timestamp to start from

## Account (requires API keys)

### get_balance
Get all non-zero account balances. No parameters.

### get_trade_history
Get executed trades.
- `offset` (optional): Pagination offset

### get_open_orders
List open orders. No parameters.

## Trading (requires API keys) ⚠️

### place_order
Place a buy or sell order. **REAL MONEY.**
- `pair` (required): Trading pair
- `direction` (required): `buy` or `sell`
- `order_type` (required): `market` or `limit`
- `volume` (required): Amount in base currency (e.g. `0.01` for BTC)
- `price` (optional): Required for limit orders
- `validate` (optional): `true` for dry run — **always use this first**

### cancel_order
Cancel an open order.
- `txid` (required): Transaction ID from place_order
