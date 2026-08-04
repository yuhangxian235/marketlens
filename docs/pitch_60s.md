# 60-Second Pitch

> Onchain Agents can prepare transactions faster than people can inspect them. But a transaction that is safe alone may become unsafe inside a batch.
>
> MarketLens is a pre-sign policy firewall for Onchain Agent batches. A deterministic Agent proposes five unsigned actions. The user sets payment, evidence, and conflict rules. Every proposal carries Moss adapter evidence generated through real local Anvil `debug_traceCall`. The batch engine then produces canonical Action Receipts and one Batch Receipt.
>
> In this demo, five proposals become two eligible and three blocked: one exceeds the payment limit, one hits a real `NothingToClaim` revert, and one passes Moss plus every action-level rule but is still blocked because it conflicts with another action in the batch.
>
> Nothing is signed. Nothing is broadcast. Nothing is deployed on Monad. The point is simple: let the Agent propose, let Moss prove execution truth, and let the user’s policy keep control before the wallet signs.

