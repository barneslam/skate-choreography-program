# Skate Choreography Program

AI-assisted figure skating program design application.

## Intended deployment

Netlify site: https://skate-choreography-program.netlify.app/

## Core workflow

1. Student selects the skater/STAR profile and uploads the program music.
2. The selected STAR level loads its pre-programmed requirements automatically.
3. Coach gives program-execution direction by written text or voice.
4. AI combines STAR-level requirements, uploaded music and coach direction.
5. AI generates three valid concepts: Entry, Intermediate and Advanced.
6. The app asks: “Do you want to see what we have designed?”
7. Coach/student preview and compare the three concepts.
8. A concept is selected.
9. The coach is asked whether further editing is required.
10. If yes, the Coach Editor allows changes to element timing, entry, exit, sequence and rink placement.
11. The music remains fixed as the synchronization reference during choreography editing.
12. Finalization sends the program toward requirements validation and binder generation.

## Design principle

The coach remains the choreographic authority. AI removes the mechanical work of assembling, synchronizing, validating and visualizing the program.

## Animation phase

The next phase will evaluate a real-person/photo-upload animation system. The goal is to allow the coach and student to watch the selected Entry, Intermediate or Advanced design with the actual music before final approval.

The animation layer should consume structured program data including element type, timestamp, rink coordinates, entry path, execution path, exit path and transitions.

## Current status

This repository contains the first working front-end workflow prototype in `index.html`.
