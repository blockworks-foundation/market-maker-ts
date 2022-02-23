# Mango Markets Market Maker

## Setup
To run the market maker you will need:
* A Solana account with some SOL deposited to cover transaction fees
* A Mango Account with some collateral deposited and a name (tip: use the UI)
* Your wallet keypair saved as a JSON file
* `node` and `yarn`

```shell
mkdir blockworks-foundation
cd blockworks-foundation
git clone https://github.com/blockworks-foundation/market-maker-ts.git
cd market-maker-ts
yarn install

## Open .env file and set env vars like this example ##
export KEYPAIR=~/.config/solana/id.json
export ENDPOINT_URL="https://mango.rpcpool.com/946ef7337da3f5b8d3e4a34e7f88"
export PARAMS=default.json

## Set mangoAccountName in params file to reflect the name of your MangoAccount
```

## Run via terminal
```shell
. run.sh
```

## Run via systemd
If you're running the market maker on a server, you might want to run it via systemd to have auto restarts
```shell
chmod 755 run.sh
cd /etc/systemd/system
sudo nano mm.service

## Set the systemd service file like this and replace the *** lines with your own
***ExecStart=/home/dd/blockworks-foundation/market-maker-ts/run.sh
***WorkingDirectory=/home/dd/blockworks-foundation/market-maker-ts/
Restart=always
RuntimeMaxSec=1800
RestartSec=5s
LimitNOFILE=4096
IgnoreSIGPIPE=false
KillMode=control-group
***User=dd

sudo systemctl daemon-reload
sudo systemctl start mm.service
```

You can watch the log output with:
```shell
journalctl -f -u mm.service
```

And stop the mm:
```shell
sudo systemctl stop mm.service
```


## Environment Variables
| Variable | Default | Description |
| -------- | ------- | ----------- |
| `ENDPOINT_URL` | `https://mango.rpcpool.com` | Your RPC node endpoint |
| `KEYPAIR` | `${HOME}/.config/solana/id.json` | The location of your wallet keypair |
| `PARAMS` | `default.json` | params file |


## Market Maker Params
### See params/default.json for an example
| Variable            | Default     | Description                                                                       |
|---------------------|-------------|-----------------------------------------------------------------------------------|
| `group`             | `mainnet.1` | Name of the group in ids.json                                                     |
| `interval`          | `10000`     | Milliseconds to wait before updating quotes                                       |
| `mangoAccountName`  | N/A         | The MangoAccount name you input when initializing the MangoAccount via UI         |
| `mangoAccountPubkey` | N/A         | If no MangoAccount name, just pass in the pubkey                                  |
| `assets`            | N/A         | Mapping of symbols to trade and their specific params                             |
| `size_perc`         | `0.1`       | The size of each order as a percentage of equity                                  |
| `charge`            | `0.0010`    | How much to increase quote width from centralized exchange                        |
| `lean_coeff`        | `0.0005`    | How much to move the quotes per unit size of inventory                            |
| `bias`              | `0`         | Fixed amount to bias. Negative values bias downward. e.g. -0.0005 biases down 5bps |
| `requoteThresh`     | `0`         | How much new bid/ask price must change to requote; e.g. 0.0002 implies 2bps       |
| `ftxSize`           | `100000`    | How much to look up spread on centralized exchange                                |
| `tif`               | N/A         | Time in force in seconds for maker orders                                         |


