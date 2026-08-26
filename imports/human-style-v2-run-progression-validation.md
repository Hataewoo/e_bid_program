# Human-style V2 Run Progression Validation

Masters: 28
Fixture match: true (LOW→LOW_LOW→0, expected LOW→LOW_LOW→0)

## STEP1 distribution
{"LOW":11,"HIGH":17}
deeper=28 structural=26 run_progression=0 uncertain=0
resolution: structural_decision=26, deeper_discrimination=2

## STEP2 distribution
{"LOW_LOW":4,"HIGH_LOW":12,"HIGH_HIGH":5,"LOW_HIGH":7}
deeper=23 structural=16 run_progression=0 uncertain=2
resolution: structural_decision=16, naturalness_total=5, deeper_discrimination=5, uncertain_fallback=2

## Final digit distribution
{"0":2,"1":2,"2":4,"3":2,"4":1,"5":3,"6":7,"7":2,"8":3,"9":2}

## Progression phase distribution
STEP1: insufficient_evidence=17, early=7, at_termination_zone=3, approaching_termination=1
STEP2: early=5, insufficient_evidence=23

## structuralPreference distribution
STEP1: neutral=26, terminate=2
STEP2: neutral=28

## Progression trace samples (termination approach)
- Master tail=8 STEP1: activeRun=2 hist=[1,1] center=1 upper=1 phase=at_termination_zone cont=1.95 term=2.03 pref=terminate winner=HIGH method=structural_decision
- Master tail=2 STEP1: activeRun=2 hist=[2,1] center=1.5 upper=1.75 phase=at_termination_zone cont=2.03 term=2.01 pref=neutral winner=LOW method=structural_decision
- Master tail=7 STEP1: activeRun=2 hist=[1,3] center=2 upper=2.5 phase=approaching_termination cont=2.03 term=2.08 pref=terminate winner=HIGH method=structural_decision

## Human fixture trace excerpt
Human-style V2 state counterfactual — 1000 digits, tail=0

STEP1 — MainBand state counterfactual
branch: tail 0 · MainBand=LOW run ×1

candidate LOW (저점 [0~4]):
  state: continuation
  simulated S: [1,1,3,2,4,1,3,1,1,3,2,2,2,1,1,1,1,1,2,2,4,3,4,1,3,2,2,1,1,1,1,3,1,3,1,2,1,1,2,1,1,1,5,1,1,1,1,1,4,2,2,3,1,4,1,1,2,1,3,1,1,1,1,2,1,2,3,1,2,1,3,2,2,2,2,4,2,5,1,1,1,3,1,3,2,1,8,1,2,4,4,1,3,2,1,1,1,3,4,2,2,1,6,1,1,1,1,2,4,1,2,1,10,3,2,1,1,1,1,1,2,2,1,2,5,2,2,1,2,3,2,3,1,4,1,1,1,3,2,3,2,3,2,1,2,2,3,1,1,1,1,1,1,1,1,1,2,4,2,1,1,4,1,2,3,2,6,8,3,1,1,2,1,1,1,1,1,1,2,1,5,1,1,4,2,2,1,1,1,2,1,2,2,2,1,1,2,2,1,2,1,1,1,1,1,2,1,2,1,1,2,2,1,2,1,2,1,2,2,1,2,2,3,2,1,1,1,1,2,2,2,3,3,1,2,1,2,4,1,2,1,1,1,2,1,1,2,3,6,1,1,1,2,1,1,4,1,1,1,2,1,3,1,2,2]
  virtual: LOW continuation: S run 1→2 [1,1,3,2,4,1,3,1,1,3,2,2,2,1,1,1,1,1,2,2,4,3,4,1,3,2,2,1,1,1,1,3,1,3,1,2,1,1,2,1,1,1,5,1,1,1,1,1,4,2,2,3,1,4,1,1,2,1,3,1,1,1,1,2,1,2,3,1,2,1,3,2,2,2,2,4,2,5,1,1,1,3,1,3,2,1,8,1,2,4,4,1,3,2,1,1,1,3,4,2,2,1,6,1,1,1,1,2,4,1,2,1,10,3,2,1,1,1,1,1,2,2,1,2,5,2,2,1,2,3,2,3,1,4,1,1,1,3,2,3,2,3,2,1,2,2,3,1,1,1,1,1,1,1,1,1,2,4,2,1,1,4,1,2,3,2,6,8,3,1,1,2,1,1,1,1,1,1,2,1,5,1,1,4,2,2,1,1,1,2,1,2,2,2,1,1,2,2,1,2,1,1,1,1,1,2,1,2,1,1,2,2,1,2,1,2,1,2,2,1,2,2,3,2,1,1,1,1,2,2,2,3,3,1,2,1,2,4,1,2,1,1,1,2,1,1,2,3,6,1,1,1,2,1,1,4,1,1,1,2,1,3,1,2,1 → 1,1,3,2,4,1,3,1,1,3,2,2,2,1,1,1,1,1,2,2,4,3,4,1,3,2,2,1,1,1,1,3,1,3,1,2,1,1,2,1,1,1,5,1,1,1,1,1,4,2,2,3,1,4,1,1,2,1,3,1,1,1,1,2,1,2,3,1,2,1,3,2,2,2,2,4,2,5,1,1,1,3,1,3,2,1,8,1,2,4,4,1,3,2,1,1,1,3,4,2,2,1,6,1,1,1,1,2,4,1,2,1,10,3,2,1,1,1,1,1,2,2,1,2,5,2,2,1,2,3,2,3,1,4,1,1,1,3,2,3,2,3,2,1,2,2,3,1,1,1,1,1,1,1,1,1,2,4,2,1,1,4,1,2,3,2,6,8,3,1,1,2,1,1,1,1,1,1,2,1,5,1,1,4,2,2,1,1,1,2,1,2,2,2,1,1,2,2,1,2,1,1,1,1,1,2,1,2,1,1,2,2,1,2,1,2,1,2,2,1,2,2,3,2,1,1,1,1,2,2,2,3,3,1,2,1,2,4,1,2,1,1,1,2,1,1,2,3,6,1,1,1,2,1,1,4,1,1,1,2,1,3,1,2,2]
  future shape: oneBetween>oneBetween>oneBetween>oneBetween>leaf|dup=at_hint_ceiling|phase=transition
  childBehavior: terminates
  parentImplication: keep
  naturalness: cont=0.30 term=0.65 marker=0.00 alt=0.80 nested=0.70 penalty=0.10 total=2.03
  tie: delta=0.000 (neutral) disc=1.624
  structural: primary child=terminates→parent=keep | deeper child=terminates→parent=keep
  deeper@oneDuplicate: total=2.03 child=terminates parent=keep
  recursive path: oneBetween → oneBetween → oneBetween → oneBetween → leaf

candidate HIGH (고점 [5~9]):
  state: switch
  simulated S: [2,1,1,1,8,4,1,1,1,5,1,1,3,1,1,1,4,1,1,6,2,1,6,2,2,1,3,1,3,2,2,3,1,1,1,2,2,2,2,1,3,1,3,3,1,2,1,1,1,2,1,3,2,3,7,1,3,1,1,3,3,2,1,1,1,6,1,1,1,2,1,4,3,2,1,1,5,1,4,1,4,1,3,1,2,1,1,4,1,1,1,2,1,1,1,2,2,2,1,1,1,2,1,5,1,2,5,1,2,1,2,1,1,2,1,1,2,2,1,1,1,2,1,1,2,3,2,1,1,2,1,1,2,4,1,1,1,2,1,3,1,1,4,1,2,1,1,2,1,1,1,3,3,1,2,2,1,1,1,2,2,1,2,1,1,1,3,2,4,1,2,2,1,1,6,1,1,2,5,1,3,5,1,2,1,2,2,1,2,2,2,3,2,3,2,1,2,2,1,1,2,5,1,5,2,2,1,2,5,1,3,1,1,1,1,1,2,1,1,1,1,2,1,1,1,2,1,1,1,3,1,1,1,3,2,1,3,2,2,6,1,1,1,1,2,1,2,4,1,3,2,2,1,1,2,1,1,1,2,1,1,2,2,2,1,1]
  virtual: LOW run ends at 1; HIGH switch start → [2,1,1,1,8,4,1,1,1,5,1,1,3,1,1,1,4,1,1,6,2,1,6,2,2,1,3,1,3,2,2,3,1,1,1,2,2,2,2,1,3,1,3,3,1,2,1,1,1,2,1,3,2,3,7,1,3,1,1,3,3,2,1,1,1,6,1,1,1,2,1,4,3,2,1,1,5,1,4,1,4,1,3,1,2,1,1,4,1,1,1,2,1,1,1,2,2,2,1,1,1,2,1,5,1,2,5,1,2,1,2,1,1,2,1,1,2,2,1,1,1,2,1,1,2,3,2,1,1,2,1,1,2,4,1,1,1,2,1,3,1,1,4,1,2,1,1,2,1,1,1,3,3,1,2,2,1,1,1,2,2,1,2,1,1,1,3,2,4,1,2,2,1,1,6,1,1,2,5,1,3,5,1,2,1,2,2,1,2,2,2,3,2,3,2,1,2,2,1,1,2,5,1,5,2,2,1,2,5,1,3,1,1,1,1,1,2,1,1,1,1,2,1,1,1,2,1,1,1,3,1,1,1,3,2,1,3,2,2,6,1,1,1,1,2,1,2,4,1,3,2,2,1,1,2,1,1,1,2,1,1,2,2,2,1 → 2,1,1,1,8,4,1,1,1,5,1,1,3,1,1,1,4,1,1,6,2,1,6,2,2,1,3,1,3,2,2,3,1,1,1,2,2,2,2,1,3,1,3,3,1,2,1,1,1,2,1,3,2,3,7,1,3,1,1,3,3,2,1,1,1,6,1,1,1,2,1,4,3,2,1,1,5,1,4,1,4,1,3,1,2,1,1,4,1,1,1,2,1,1,1,2,2,2,1,1,1,2,1,5,1,2,5,1,2,1,2,1,1,2,1,1,2,2,1,1,1,2,1,1,2,3,2,1,1,2,1,1,2,4,1,1,1,2,1,3,1,1,4,1,2,1,1,2,1,1,1,3,3,1,2,2,1,1,1,2,2,1,2,1,1,1,3,2,4,1,2,2,1,1,6,1,1,2,5,1,3,5,1,2,1,2,2,1,2,2,2,3,2,3,2,1,2,2,1,1,2,5,1,5,2,2,1,2,5,1,3,1,1,1,1,1,2,1,1,1,1,2,1,1,1,2,1,1,1,3,1,1,1,3,2,1,3,2,2,6,1,1,1,1,2,1,2,4,1,3,2,2,1,1,2,1,1,1,2,1,1,2,2,2,1,1]
  future shape: oneBetween>oneDuplicate>oneDuplicate>oneBetween>leaf|dup=none|phase=transition
  childBehavior: uncertain
  parentImplication: neutral
  naturalness: cont=0.30 term=0.60 marker=0.00 alt=0.80 nested=0.70 penalty=0.00 total=2.08
  tie: delta=0.000 (neutral) disc=1.637
  structural: primary child=uncertain→parent=neutral | deeper child=terminates→parent=neutral
  deeper@oneDuplicate: total=2.03 child=terminates parent=neutral
  recursive path: oneBetween → oneDuplicate → oneDuplicate → oneBetween → leaf

firstDiscriminatingPattern: oneDuplicate
tieResolution: margin=0.0500 threshold=0.08 method=structural_decision uncertain=false deeperDrill=true structural=true reason=unique_deeper_keep
runProgression:
  selectedPattern: oneBetween
  activeRun: 1
  historicalRuns tail: [3,2,3,1,1]
  typicalCenter: 1 typicalUpperBoundary: 3
  phase: early
  continuationShape: 2.03 switchShape: 2.03