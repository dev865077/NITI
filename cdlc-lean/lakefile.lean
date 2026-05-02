import Lake
open Lake DSL

package cdlcLean where

require mathlib from git
  "https://github.com/leanprover-community/mathlib4.git" @ "v4.5.0"

lean_lib Cdlc where

lean_lib Lightning where

lean_lib SecurityClaims where
