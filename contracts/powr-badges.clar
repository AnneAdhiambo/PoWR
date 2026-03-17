;; powr-badges.clar
;; PoWR Skill Badges - Soulbound SIP-009 NFTs
;;
;; Mints non-transferable skill badges to developers who meet verified
;; thresholds in each skill dimension. Badges are "soulbound": they are
;; tied to the recipient's Stacks address and cannot be moved.
;;
;; SIP-009 compliance:
;;   All four required trait functions are implemented.
;;   transfer() always fails with ERR-SOULBOUND to enforce non-transferability.
;;
;; SIP-019 compliance:
;;   Metadata-update events are printed on mint so Hiro's Token Metadata API
;;   auto-indexes badge URIs without manual registration.
;;
;; Badge dimensions (skill-type):
;;   u0 = Backend    u1 = Frontend    u2 = DevOps    u3 = Architecture
;;
;; Badge tiers (tier):
;;   u1 = Bronze  (score >= 40)
;;   u2 = Silver  (score >= 70)
;;   u3 = Gold    (score >= 90)

;; --- Errors ---
(define-constant ERR-NOT-ORACLE (err u100))
(define-constant ERR-NOT-OWNER (err u101))
(define-constant ERR-SOULBOUND (err u103))
(define-constant ERR-INVALID-TIER (err u104))
(define-constant ERR-INVALID-SKILL (err u105))

;; --- Constants ---
(define-constant CONTRACT-OWNER tx-sender)
(define-constant BASE-URI "https://api.powr.dev/badges/metadata/")

;; --- Data Variables ---
(define-data-var oracle-principal principal CONTRACT-OWNER)
(define-data-var last-token-id uint u0)

;; --- Data Maps ---

;; Token ownership
(define-map token-owner uint principal)

;; Token metadata
(define-map token-data
  uint
  {
    recipient:  principal,
    skill-type: uint,
    tier:       uint,
    minted-at:  uint
  }
)

;; Prevent duplicate badges: one badge per (user, skill-type, tier)
(define-map badge-issued
  { recipient: principal, skill-type: uint, tier: uint }
  uint  ;; token-id
)

;; --- Private Helpers ---

(define-private (is-oracle)
  (is-eq tx-sender (var-get oracle-principal))
)

(define-private (valid-skill-type (skill-type uint))
  (< skill-type u4)
)

(define-private (valid-tier (tier uint))
  (and (>= tier u1) (<= tier u3))
)

;; --- SIP-009 Required Functions ---

;; Returns the highest token ID minted so far.
(define-read-only (get-last-token-id)
  (ok (var-get last-token-id))
)

;; Returns the metadata URI for a given token.
;; The token ID is appended by the client at BASE-URI/{token-id}.
;; Returns none if the token does not exist.
(define-read-only (get-token-uri (token-id uint))
  (if (is-some (map-get? token-data token-id))
    (ok (some BASE-URI))
    (ok none)
  )
)

;; Returns the current owner of a token.
(define-read-only (get-owner (token-id uint))
  (ok (map-get? token-owner token-id))
)

;; Soulbound enforcement: transfer is permanently disabled.
;; Required by SIP-009 but always fails with ERR-SOULBOUND.
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  ERR-SOULBOUND
)

;; --- Oracle-Gated Writes ---

;; Mint a skill badge to a developer.
;; Idempotent: if the exact same (recipient, skill-type, tier) badge already
;; exists, returns the existing token ID rather than minting a duplicate.
;;
;; @param recipient   Developer's Stacks principal
;; @param skill-type  0=Backend 1=Frontend 2=DevOps 3=Architecture
;; @param tier        1=Bronze 2=Silver 3=Gold
(define-public (mint-badge
    (recipient  principal)
    (skill-type uint)
    (tier       uint))
  (let (
    (existing (map-get? badge-issued { recipient: recipient, skill-type: skill-type, tier: tier }))
  )
    (asserts! (is-oracle) ERR-NOT-ORACLE)
    (asserts! (valid-skill-type skill-type) ERR-INVALID-SKILL)
    (asserts! (valid-tier tier) ERR-INVALID-TIER)
    (match existing
      token-id (ok token-id)  ;; already exists - return existing token-id
      (let (
        (new-id (+ (var-get last-token-id) u1))
      )
        (var-set last-token-id new-id)
        (map-set token-owner new-id recipient)
        (map-set token-data new-id {
          recipient:  recipient,
          skill-type: skill-type,
          tier:       tier,
          minted-at:  stacks-block-height
        })
        (map-set badge-issued
          { recipient: recipient, skill-type: skill-type, tier: tier }
          new-id
        )
        ;; SIP-019 metadata notification - enables Hiro Token Metadata API auto-indexing
        (print {
          notification: "token-metadata-update",
          payload: {
            token-class: "nft",
            contract-id: (as-contract tx-sender),
            token-ids:   (list new-id)
          }
        })
        (print {
          event:      "badge-minted",
          token-id:   new-id,
          recipient:  recipient,
          skill-type: skill-type,
          tier:       tier,
          minted-at:  stacks-block-height
        })
        (ok new-id)
      )
    )
  )
)

;; Rotate the oracle principal (owner only).
(define-public (set-oracle (new-oracle principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-OWNER)
    (print { event: "oracle-rotated", old-oracle: (var-get oracle-principal), new-oracle: new-oracle })
    (ok (var-set oracle-principal new-oracle))
  )
)

;; --- Additional Read-Only Helpers ---

;; Check if a developer holds a specific badge.
(define-read-only (has-badge
    (recipient  principal)
    (skill-type uint)
    (tier       uint))
  (is-some (map-get? badge-issued { recipient: recipient, skill-type: skill-type, tier: tier }))
)

;; Get token metadata without going through the URI.
(define-read-only (get-badge-data (token-id uint))
  (map-get? token-data token-id)
)

;; Get the current oracle principal.
(define-read-only (get-oracle)
  (var-get oracle-principal)
)
