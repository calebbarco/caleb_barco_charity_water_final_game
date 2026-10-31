# Charity: water Game Prototype

In this project, you’ll begin transforming your game concept from last week into a working interactive prototype using HTML, CSS, and JavaScript.

This first version should focus on core functionality — clickable elements, score tracking, and a basic layout. The goal is to bring your idea to life with simple, working mechanics that you’ll refine and expand in the next milestone.

## Gameplay

Choose Easy, Normal, or Hard on the homepage before starting a round. Easy gives you more time and lives, slower ghosts, fewer hazards, and more clean water. Normal keeps the standard balance. Hard gives you less time and fewer lives, faster ghosts, more hazards, and less clean water. Each successful level unlocks the next one; the challenge multiplier grows exponentially as `1.15^(level - 1)`, increasing ghost speed and hazards while reducing time, lives, and clean water. Use the arrow keys (or on-screen arrows) to move and Space (or the Dig button) to dig. Explore the endless underground to collect clean-water pockets and return to the surface before time runs out. The game tracks score, collected gallons, lives, time, and deepest depth reached.

The results estimate one person helped for every 100 gallons collected, so a run with no water collected helps zero people. The leaderboard keeps the 20 most recent finished runs, their difficulty, and their level in this browser only; scores are not sent to a server.

The game also plays synthesized, retro arcade-style sound effects and looping music during gameplay. Use the Sound button in the controls to turn audio off or back on. Score milestones at 100, 500, 1,000, 2,500, and 5,000 points display an encouraging message.
