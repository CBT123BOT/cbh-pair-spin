# Remaining operator steps

Snapshot these notes were written from: runtime handoff 2026-11-08 18:27 America/Chicago, validated ledger tip 108206819. This file does not activate fees, watchers, or the white paper.

https://cbt123.grok.me is a separate page. This repository does not publish it. The reviewed standalone HTML was copy reference only and is not in this site.

## What this repository changed, and what it did not

Implemented here, still not proof of GitHub Pages, and not backend activation:

- Home lists Pair Spin above the Vault. Purpose line is affordable collecting and fun, with no spending pressure and no investment promise.
- Pair Spin files are unchanged. D2 stays 11.82 XRP. Gift-pair request stays 0.1 XRP.
- Vault stays open and still requests 0.1 XRP (`spin_fee_drops` 100000) while `fee_schedule` is `PENDING_NOT_LIVE`.
- Slots, Coin, and Vending pages stay open to read. A pay button stays off unless that machine's status is fresh, `accepting_payments` is boolean true, `fee_schedule` is exactly `live`, and `fee_epoch_close_unix` is an integer. Slots also requires the page `fee_schedule` to be `live`. Shipped status files keep `accepting_payments` false, `fee_schedule` pending, and `updated_unix` 0. `slots.json` still has the old `paid_spins_enabled: true` flag. The page does not treat that flag as permission.
- Planned 0.01 XRP requests, and paid Slots at 0.5 XRP for one or exactly 1 XRP total for three, are labeled not active. 0.01 is not a promise that it covers every processing cost.

Not done, because this repository cannot do it:

- No watcher, cursor, STOP file, seed, or fee epoch is in this git repo.
- `fee-cutover.patch` is not applied here and was not applied on the live trees at 18:27.
- No signing, submission, replay, cursor move, or watcher start.

The Nov 6 Pages failure was not a Jekyll error. Run 42268301501 built the site, then `actions/deploy-pages` stayed at `deployment_queued` and ended with the only annotation `Deployment failed, try again later.` A later merge of that static branch did publish. See the run for commit `216d2ebf143e5ad36a2a6ab67caf2f3ccf231dc4`.

Deployed means GitHub Pages has finished a build of the commit. The site source is branch `main`, path `/`, at https://cbt123bot.github.io/cbh-pair-spin/ . The Nov 6 attempt looked stuck in the Pages builds list, but the Actions run had already finished as a deploy failure. That list is not the job log. After the static merge, confirm the Actions run for that commit is success and the live home page lists Pair Spin first. A merge by itself is not that confirmation.

## Runtime at 18:27 CST, which is not readiness

Pair and Vault were current. Slots, Coin, and Vending were not.

- Pair `watcher.py` alive. `assignments.json` last_ledger=108206819, unfinished jobs 0, processed=116. Pair STOP absent.
- Vault `vault_watcher2.py` alive. `vault_state.json` last_ledger=108206818, jobs 25 all done, processed=52, used=24. Vault STOP absent.
- Slots `slot_watcher.py` not running. STOP present at the slots tree, mtime Nov 6 09:01:15 CST, text starts `paused: Request failed, 502 Bad Gateway`. `slots_state.json` last_ledger=107920822, mtime Nov 6 09:00:52 CST, jobs 11 all done, processed=14. Gap versus tip about 285997 ledgers, about 317 hours. `ops/check_state.py` returned FAIL and exit 1: state about 285991 ledgers behind. That refusal is the stale-state guard. Do not bypass it, lower it, or start the watcher while it still fails.
- Coin `coin_watcher.py` absent. `coin_state.json` last=108155103, mtime Nov 6 09:01:11 CST, 1 request done, 1 group complete, pending_mints=0.
- Vending `ashes_watcher.py` absent. `ashes_state.json` last for 2XuB=108155103 and last for the M2N issuer=107861454, mtime Nov 6 09:01:11 CST, 1 build done, burns=0. `data_mainnet/GO` was present and empty. STOP and COIN_STOP were absent. An empty GO file does not make the machines ready while the processes are absent.
- `sync_mainnet_results.sh` absent. Notifier and monitor pidfiles were stale. No `slots_status.json` heartbeat on that staged site tree. `version.json` there was still `{"slots":"20261022-0830","index":"20261022-0600"}`.
- Loaded fees, not the planned cutover: Vault `SPIN_FEE_DROPS=100000` hardcoded in `vault_watcher2.py`. Slots `fee_drops=100000`, `paid_spin_drops=500000`. Coin and Vending `machine_fee_drops=100000`. No `fee_epoch_close_unix`, `bundle_enabled`, or `fee_policy.py` on the live trees.

`ensure.log` at 18:07:52 CST said pair and vault were already running and slots was not started because it was behind. Do not run `ensure_watchers.sh` to finish this. It starts signing services when secrets are present and can clear an automatic STOP after `start.sh`.

## Source checksums the operator must match

These are the live backend files observed at 18:27. This git repo does not contain them. Before any restore or patch, hash the file that is actually on the runtime box. If the hash differs, stop. Do not apply a patch to a different file.

- `watcher.py` `745727b080c253cc1db3edd3229c2acff4681aae0bb2434f9053b6dd9518e044` mtime Nov 6 09:00:29
- `vault_watcher2.py` `a348d9a91c4c100ecc8380ab9f62a8509f440dc881c3aef74ba408e186292667` mtime Nov 6 09:00:51
- `slot_watcher.py` `d90fcc834ec137656e8d3b45be783019523adfaa05239592157c7ce833deebbe` mtime Nov 6 09:00:52
- `coin_watcher.py` `822a313539ab2b0b9d3f1ca0a98a78a9654d795094c06c7419ad51c3d50d1df8` mtime Nov 6 09:01:11
- `ashes_watcher.py` `0539e256b8321bae09b2398bfe73654115d324019ee725379a4c7c3bac15ce3b` mtime Nov 6 09:01:11
- `ensure_watchers.sh` `d481c883a2825c8a8a55148e26cf6d2884d0e911c86101d5492777883c30f558`
- `sync_mainnet_results.sh` `8a1bdb8d56c76d08a27e19501f3820a93673ae26bc7fa2abe8b27004632e6517`

Offline package identity, also not installed by this repo. The copies reviewed with this change hashed to the same values:

- `fee-cutover.patch` `da523156a6c8c60788a09ce44fd84cff81335427cbef3041ac1838745400ec5a`
- `CUTOVER_AND_ROLLBACK.md` `f8490f7e769e9a7f659efcb907a7cef748fa6756d1c3cd195d818b8fbf6b11d2`
- `review.md` `32df4cc87c95e28eacafa444a846510f290b06cd67fe89c06975788cefbdeffb`
- `source-sanitized.tar.gz` `32c669dc8b1228e28b4544691f560804318ebd29c38466d2850c794d3578297f`

`BLOCKERS.md` was not in the cloud-return folder on that box. Do not treat an offline test of the patch as proof that 0.01 fees or any stopped machine is operational.

## Payment-gap coverage, and no wider claim

Wallet checked: `rNxAwKP3rdNTfe4ZNw1SntXCfW2U4r2XuB`. Public `account_info` PreviousTxnLgrSeq was 107979473, so no later transaction on that account through tip 108206819.

Slots downtime, cursor 107920822. Bounded complete scan: `account_tx` forward, `ledger_index_min=107920823`, `ledger_index_max=107979473`, pages=1, wrappers=15, incomplete=false. Incoming payments to that wallet in the window: 4. Memo types: CBH-PAIR ×1, CBH-VAULT ×2, none ×1. CBH-SLOT count: 0. Open slots jobs in state were all done. This does not make Slots ready to unpause.

Coin and Vending, cursor 108155103. Forward scan from 108155104 to the tip: pages=1, wrappers=0, incoming payments=0, incomplete=false. The same 107920823–107979473 window had no CBH-COIN and no CBH-ASHES memo. M2N issuer `rJWC1VtyonPsTPJS1U8MZkszx6xypSYxwY` from ledger 107861455: pages=4, wrappers=1349, incomplete=false, incoming payments=1, memo type none, and `m2n_pay_enabled` false. Local coin and vending jobs were the one finished request and the one finished build. Do not say there was no activity anywhere outside these account and memo scopes.

Pair and Vault `check_state`: 0 new incoming to catch up, unfinished 0.

## Restore rules

Preserve cursors and processed sets. Preserve historical snapshot behavior. Do not bypass the stale-state guard.

1. Slots. Do not clear STOP, do not run `ensure_watchers.sh`, and do not start `slot_watcher.py` while `check_state.py` still exits 1 for the lag. A later catch-up plan must keep `last_ledger` at 107920822 or later and must not delete the 14 processed entries. Forward scan of payments that arrived while the watcher was stopped is existing cursor behavior. Do not move the cursor backward to hurry it, and do not skip the Oct 31 or Nov 1 snapshots the watcher would apply on resume. Re-check the unserved-payment window at restore time. The 18:27 scan is coverage for that window, not a permanent all-clear.
2. Coin and Vending. Starting them is a separate operator action. `ensure_watchers.sh` does not cover it. Use the existing start recipe only under an explicit activation decision. Re-verify the covered accounts at start time. Publish a real heartbeat from the running process before the page button can open. The JSON files in this repo are the fail-closed placeholders. Do not flip `accepting_payments` in git.
3. Pair and Vault. Leave the running processes, their cursors, and their 0.1 / 11.82 amounts alone. Do not restart them as part of a Slots or fee change.
4. Fee cutover, only after the machines that will take payments are actually operable, or while the page buttons are still gated. Install the inert patch on the real tree only when the script hashes above still match. Leave epochs null and leave `fee_drops` and `machine_fee_drops` at 100000. Set `fee_epoch_close_unix` to a current validated ledger close time. Never backdate it onto the stopped Slots backlog. The bundle needs its own flag and its own epoch. Resume from the saved cursor. A hash already in `processed` or `jobs` keeps its original count. Legacy 1 XRP stays two paid spins. Legacy 1.50 XRP stays three. An old 0.10 XRP earned or Vault payment stays one request, not ten spins.
5. Results sync. Restore the documented launch environment for `sync_mainnet_results.sh` before relying on GitHub Pages result files. The Nov 6 staged copies were already stale at 18:27.
6. Paid Slots. Legal readiness is still unresolved. Do not set `accepting_payments` true for chance prizes until that is recorded. The fee name is not that record.
7. White paper. Keep the pending wording until the backend epoch is verified on the loaded watcher and a fresh status file exists. The sentence swap in the offline cutover doc is a later manual edit for cbt123.grok.me. Do not do it from this repo.

## Static rollback

Revert this commit on `main` and confirm Pages is serving the previous home page. Do not touch watcher cursors, STOP, or processed keys as part of that revert. After a revert, Slots again trusts `paid_spins_enabled` in `slots.json`. If the watcher is still stopped, that flag should not be left as if payments were being accepted. There is no epoch in this repo to clear, and there is nothing to replay.

## Blockers

1. Slots is stopped, about 317 hours behind, and `check_state.py` refuses it. Not auto-restorable from this repo.
2. Coin and Vending processes are absent.
3. New fees are not installed on the live backend. Live code is still 0.10 XRP and the old paid ladder.
4. Results sync is absent.
5. Paid-prize legal readiness is unresolved.
6. GitHub Pages builds for this repo are failing or stuck, so this branch is not a published site until a build of the merged commit succeeds.
7. The original white paper was not updated.
