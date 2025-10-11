# Commons Baseball - Turn Sequence Flowchart

```mermaid
flowchart TD
    Start([Start of Turn]) --> P1{Pitcher: Play<br/>Baseball God?}
    
    P1 -->|Yes - 2Out Super| End1[2 Outs<br/>Turn Ends]
    P1 -->|Yes - Out Card| B1{Batter:<br/>Challenge?}
    P1 -->|No| P2[Pitcher: Deliver Pitch<br/>Roll Die or<br/>Intentional Walk]
    
    B1 -->|No| End2[Batter Out<br/>Turn Ends]
    B1 -->|Yes| P2
    
    P2 --> P3{Pitch<br/>Outcome?}
    
    P3 -->|Roll > OUT| End3[Auto Out<br/>Turn Ends]
    P3 -->|Roll > HIT| End4[Auto Single<br/>Turn Ends]
    P3 -->|Roll < BB| End5[Walk<br/>Turn Ends]
    P3 -->|Pitch Delivered| B2{Runner on 1st<br/>& Second Base<br/>Open?}
    
    B2 -->|Yes - Steal?| Steal[Roll for Steal]
    B2 -->|No| B3
    Steal -->|Out & 2 Outs| End6[Inning Ends<br/>Batter Stays]
    Steal -->|Success| B3{Multi-team<br/>Batter?}
    Steal -->|Out| B3
    
    B3 -->|Yes - Pinch Hit?| PH[Replace Batter]
    B3 -->|No| B4
    PH --> B4{Batter: Play<br/>Hit/Double Card?}
    
    B4 -->|No| B5
    B4 -->|Hit Card| P4{Pitcher:<br/>Challenge?}
    B4 -->|Double Super| Hit2[Auto Double]
    
    P4 -->|Yes| B5{Swing for<br/>the Fences?}
    P4 -->|No| Hit1[Auto Single]
    
    B5 -->|Yes| Fence[Swing for Fences<br/>Active]
    B5 -->|No| B6[Batter: Roll to<br/>Swing or Bunt]
    Fence --> B6
    
    B6 -->|Bunt| End7[Runners Advance<br/>1 Out, Turn Ends]
    B6 -->|Swing - Roll Die| Result{Roll<br/>Result?}
    
    Result -->|< 1B| End8[Out<br/>Turn Ends]
    Result -->|≥ 1B, < 2B| CheckFence1{Fences?}
    Result -->|≥ 2B, < 3B| CheckFence2{Fences?}
    Result -->|≥ 3B, < HR| Triple[Triple!]
    Result -->|≥ HR| HR[Home Run!]
    
    CheckFence1 -->|Yes| End9[Out<br/>Turn Ends]
    CheckFence1 -->|No| Single[Single!]
    CheckFence2 -->|Yes| HR2[Home Run!]
    CheckFence2 -->|No| Double[Double!]
    
    Single --> Advance{Runners<br/>on Base?}
    Double --> Advance
    Triple --> Advance
    HR --> End10[Score Runs<br/>Turn Ends]
    HR2 --> End10
    Hit1 --> Advance
    Hit2 --> Advance
    
    Advance -->|Yes - Use<br/>Advance Cards?| Adv[Move Runners<br/>Extra Bases]
    Advance -->|No| End11[Runners Move<br/>Automatically<br/>Turn Ends]
    Adv --> End11
    
    style Start fill:#90EE90
    style End1 fill:#FFB6C1
    style End2 fill:#FFB6C1
    style End3 fill:#FFB6C1
    style End4 fill:#87CEEB
    style End5 fill:#87CEEB
    style End6 fill:#FFB6C1
    style End7 fill:#87CEEB
    style End8 fill:#FFB6C1
    style End9 fill:#FFB6C1
    style End10 fill:#FFD700
    style End11 fill:#87CEEB
    style HR fill:#FFD700
    style HR2 fill:#FFD700
```

## Legend
- **Green**: Start of turn
- **Pink/Red**: Turn ends with out(s)
- **Light Blue**: Turn ends with runner(s) on base
- **Gold**: Turn ends with run(s) scored
- **Diamond shapes**: Decision points
- **Rectangles**: Actions/outcomes

## Notes
- Each turn follows this sequence from top to bottom
- Decision points (diamonds) determine the path through the flowchart
- Multiple paths can lead to the same endpoint
- Some actions are optional and some are conditional based on game state

