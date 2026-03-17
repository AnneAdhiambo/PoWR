;; powr-registry.clar
;; PoWR Work Artifact Registry
;;
;; Stores developer work proofs (artifact hashes + skill scores) anchored to
;; Bitcoin's immutable ledger via Stacks Proof of Transfer.
;;
;; Design:
;;   - Non-upgradeable: no admin escape hatch, no proxy pattern
;;   - Oracle-gated writes: only the oracle principal can anchor snapshots
;;   - Owner can rotate the oracle principal (key compromise recovery)
;;   - All reads are public and free

;; --- Errors ---
(define-constant ERR-NOT-ORACLE (err u100))
(define-constant ERR-NOT-OWNER (err u101))
(define-constant ERR-INVALID-INPUT (err u103))

;; --- Constants ---
(define-constant CONTRACT-OWNER tx-sender)

;; --- Data Variables ---
(define-data-var oracle-principal principal CONTRACT-OWNER)

;; --- Data Maps ---

;; Primary store: one snapshot per Stacks principal (latest wins)
(define-map user-snapshots
  principal
  {
    artifact-hash:    (buff 32),
    skill-scores:     (list 10 uint),
    github-identity:  (string-ascii 64),
    anchored-at:      uint
  }
)

;; Secondary index: fast O(1) hash verification
(define-map verified-hashes (buff 32) bool)

;; --- Private Helpers ---

(define-private (is-oracle)
  (is-eq tx-sender (var-get oracle-principal))
)

;; --- Oracle-Gated Writes ---

;; Anchor or update a developer's work snapshot on-chain.
;; Called by the PoWR backend oracle after validating GitHub contribution data.
;;
;; @param user            Stacks principal linked to the developer's account
;; @param artifact-hash   SHA-256 of the serialized artifact bundle
;; @param skill-scores    Up to 10 skill dimension scores (0-100 each)
;; @param github-identity GitHub username (max 64 chars)
(define-public (anchor-snapshot
    (user             principal)
    (artifact-hash    (buff 32))
    (skill-scores     (list 10 uint))
    (github-identity  (string-ascii 64)))
  (begin
    (asserts! (is-oracle) ERR-NOT-ORACLE)
    (asserts! (> (len github-identity) u0) ERR-INVALID-INPUT)
    (map-set user-snapshots user {
      artifact-hash:   artifact-hash,
      skill-scores:    skill-scores,
      github-identity: github-identity,
      anchored-at:     stacks-block-height
    })
    (map-set verified-hashes artifact-hash true)
    (print {
      event:           "snapshot-anchored",
      user:            user,
      artifact-hash:   artifact-hash,
      github-identity: github-identity,
      anchored-at:     stacks-block-height
    })
    (ok true)
  )
)

;; Rotate the oracle principal (owner only - for key rotation / compromise recovery).
(define-public (set-oracle (new-oracle principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-OWNER)
    (print { event: "oracle-rotated", old-oracle: (var-get oracle-principal), new-oracle: new-oracle })
    (ok (var-set oracle-principal new-oracle))
  )
)

;; --- Read-Only Queries ---

;; Retrieve the full snapshot for a developer.
(define-read-only (get-snapshot (user principal))
  (map-get? user-snapshots user)
)

;; Check whether an artifact hash has ever been anchored.
;; Returns true if the hash exists, false otherwise.
(define-read-only (verify-snapshot (artifact-hash (buff 32)))
  (default-to false (map-get? verified-hashes artifact-hash))
)

;; Retrieve only the skill scores array for a developer.
(define-read-only (get-skill-scores (user principal))
  (match (map-get? user-snapshots user)
    snapshot (some (get skill-scores snapshot))
    none
  )
)

;; Retrieve the current oracle principal.
(define-read-only (get-oracle)
  (var-get oracle-principal)
)
