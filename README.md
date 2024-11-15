# SPICA: Retrieving Scenarios for Pluralistic In-Context Alignment

Supplemental repository of code and data related to our paper `SPICA: Retrieving Scenarios for Pluralistic In-Context Alignment`.

Authors: Quan Ze Chen, K.J. Kevin Feng, Chan Young Park, Amy X. Zhang

Link: TBD

![Overview Diagram](https://github.com/Social-Futures-Lab/SPICA-code/docs/high-level-diagram.png?raw=true)

When aligning large language models (LLMs) to societal values, it is important to address a plurality of values reflected by diverse groups and communities. Existing in-context learning approaches for alignment often only consider similarity to the query when drawing few-shot examples, not accounting for cross-group differences around which values are prioritized.

In this work, we propose SPICA, a framework for pluralistic alignment that accounts for group-level differences during in-context example retrieval. We introduce three designs to facilitate pluralistic alignment: scenario banks, group-informed metrics, and in-context alignment prompts.

## Overview 

This repository contains

To cite our work, please refer to CITATION.cff or use the following:

```bibTex
@misc {}
```

## Repository Layout
- `./annotation/`: Contains frontend and backend code for human annotation.
- `./docs/`: Contains code for the project website.
- `./data/`: Contains non-identifying human annotations and evaluation data.