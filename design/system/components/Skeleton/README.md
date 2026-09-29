# Loading & offline
Skeleton rows keep the layout stable while data loads; offline is a state with a one-line banner, never an error.

Skeletons mirror the row anatomy (circle, two lines, trailing block) with a slow shimmer that respects reduced motion. The offline banner is compact and outline-toned, shows the queued count, and turns success on reconnect. Timers keep running while offline.
