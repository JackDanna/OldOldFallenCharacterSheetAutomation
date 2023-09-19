namespace FakeFallenData

module Data =

    let damageTypeData = [|
        "Slash"    
        "Pierce"   
        "Bludgeon" 
        "Hew"      
        "Shockwave"
        "Fire"     
        "Water"    
        "Electric" 
        "Cold"     
        "Radiant"  
        "Silver"   
        "Poison"   
        "Necrotic" 
        "Bleed"    
        "Psychic"  
        "Spiritual"
    |]

    let penetrationCalculationData = [|
        ("WeakCalc",   8u)
        ("MediumCalc", 4u)
        ("StrongCalc", 3u)
    |]

    let calculatedEngageableOpponentsData = [| ("Focused", 1u) |]

    let engageableOpponentsCalculationData = [|
        ("SpearRapid",      2u,  "MaxEO 2")
        ("Rapid",           2u,  "None"   )
        ("Quick",           3u,  "None"   )
        ("Standard",        4u,  "None"   )
        ("Slow",            5u,  "None"   )
        ("Loading",         6u,  "None"   )
        ("Complex Loading", 10u, "None"   )
    |]

    let calculatedRangeData = [|
        ("Melee", 5u, 5u)
        ("Reach", 10u, 10u)
    |]

    let rangeCalculationData = [|
        ("Close",        2u, 5u,  false, 30u )
        ("Short",        2u, 5u,  true,  60u )
        ("Medium",       1u, 5u,  false, 120u)
        ("Extended",     1u, 10u, false, 320u)
        ("Long",         1u, 15u, false, 400u)
        ("Sharpshooter", 1u, 20u, false, 600u)
        ("Extreme",      1u, 25u, false, 700u)
    |]

    let resourceClassData = [|
        "Arrow"
        "Bolt"
        "SlingBullet"
        "BlowgunDart"
        "Ichor"
        "Light"
        "Energy"
    |]

    let attributeData = [|"STR";"RFX";"INT";|]

    let magicSkillData = [|
        ("Radiance",      "Radiant",                             0, true, "Light")
        ("Blessing",      "Radiant",                             0, true, "Light")
        ("Polycraft",     "Slash, Bludgeon, Hew, Pierce",        0, true, "Ichor")
        ("Blazecraft",    "Fire",                                0, true, "Ichor")
        ("Hydrocraft",    "Water, Slash, Hew, Bludgeon, Pierce", 0, true, "Ichor")
        ("Electrocraft",  "Electric",                            0, true, "Ichor")
        ("Terracraft",    "Slash, Bludgeon, Hew, Pierce",        0, true, "Ichor")
        ("Galecraft",     "Slash, Bludgeon, Shockwave",          0, true, "Ichor")
        ("Cryocraft",     "Cold",                                0, true, "Ichor")
        ("Naturecraft",   "Slash, Bludgeon, Hew, Pierce",        0, true, "Ichor")
        ("Toxincraft",    "Poison",                              0, true, "Ichor")
        ("Soulcraft",     "Spiritual",                           0, true, "Ichor")
        ("Shadowcraft",   "Necrotic",                            0, true, "Ichor")
        ("Mindcraft",     "Psychic",                             0, true, "Ichor")
        ("Ferracraft",    "Slash, Bludgeon, Hew, Pierce",        0, true, "Ichor")
        ("Sonocraft",     "Shockwave",                           0, true, "Ichor")
        ("Hemacraft",     "Bleed",                               0, true, "Ichor")
        ("Spidercraft",   "Bludgeon",                            0, true, "Ichor")
        ("Plasmacraft",   "Fire",                                0, true, "Ichor")
        ("Stormcraft",    "Electric, Shockwave",                 0, true, "Ichor")
        ("Magmacraft",    "Fire, Bludgeon",                      0, true, "Ichor")
        ("Blizzardcraft", "Cold, Slash, Bludgeon, Shockwave",    0, true, "Ichor")
    |]

    let magicCombatData = [|
        ("Melee Trick",   -1, "+0d6", "WeakCalc",   "Melee", "Rapid",    0u, false, "None")
        ("Melee",          0, "+0d6", "MediumCalc", "Reach", "Rapid",    1u, true,  "None")
        ("Ranged Trick",  -1, "+0d6", "WeakCalc",   "Close", "Standard", 0u, false, "None")
        ("Ranged",         0, "+0d6", "MediumCalc", "Close", "Standard", 1u, true,  "None")
        ("Cone",           0, "+0d6", "MediumCalc", "Close", "Standard", 1u, true,  "Cone")
        ("Focused",        1, "+1d6", "StrongCalc", "Close", "Focused",   1u, true,  "None")
        ("Sphere",         1, "+0d6", "MediumCalc", "Close", "Standard", 2u, true,  "Sphere")
    |]

    let weaponClassData = [|
        ("Hand Crossbow",                     "+1d6",   "+1d6",  "0", "Medium",   "",              "Standard",               "None", "None", "Bolt","{STR,RFX,INT}")
        ("Light Crossbow",                    "None",          "+1d6",  "0", "Extended", "",              "Loading",                "None", "None", "Bolt","{STR,RFX,INT}")
        ("Heavy Crossbow",                    "None",          "+2d6",  "0", "Long",     "",              "Complex Loading",        "None", "None", "Bolt","{STR,RFX,INT}")
        ("Light Ranged (Melee)",              "None",          "-1", "0", "Melee",    "Bludgeon",      "Rapid",                  "None", "None", "None","{STR,RFX,INT}")
        ("Blowgun",                           "+0d6",   "+1d6",  "0", "Medium",   "",              "Standard",               "None", "None", "BlowgunDart","{STR,RFX,INT}")
        ("Unarmed",                           "-1",  "-1", "0", "Melee",    "Bludgeon",      "Rapid",                  "None", "None", "None","{STR,RFX,INT}")
        ("Hand Protection Unarmed",           "+0d6",   "+0d6",  "0", "Melee",    "Bludgeon",      "Rapid",                  "None", "None", "None","{STR,RFX,INT}")
        ("Disarming Unarmed",                 "+3d6",   "+3d6",  "0", "Melee",    "Bludgeon",      "Rapid",                  "None", "None", "None","{STR,RFX,INT}")
        ("Disarming Hand Protection Unarmed", "+4d6",   "+4d6",  "0", "Melee",    "Bludgeon",      "Rapid",                  "None", "None", "None","{STR,RFX,INT}")
        ("Small Hafted Axe",                  "+1d6",   "+1d6",  "0", "Melee",    "Hew",           "Rapid",           "+1d6", "None", "None","{STR,RFX,INT}")
        ("Small Hafted Blade",                "+1d6",   "+1d6",  "0", "Melee",    "Slash",         "Rapid",           "+1d6", "None", "None","{STR,RFX,INT}")
        ("Small Hafted Point",                "+1d6",   "+1d6",  "0", "Melee",    "Pierce",        "Rapid",           "+1d6", "None", "None","{STR,RFX,INT}")
        ("Small Blunt",                       "+0d6",   "+0d6",  "2", "Melee",    "Bludgeon",      "Rapid",           "+1d6", "None", "None","{STR,RFX,INT}")
        ("Small Bladed",                      "+0d6",   "+0d6",  "2", "Melee",    "Slash, Pierce", "Rapid",           "+1d6", "None", "None","{STR,RFX,INT}")
        ("Thrown Small Bladed",               "+0d6",   "+0d6",  "1", "Short",    "Pierce",        "Rapid",                  "None", "None", "None","{STR,RFX,INT}")
        ("Medium Hafted Blade",               "+2d6",   "+3d6",  "0", "Melee",    "Hew",           "Rapid",           "+1d6", "None", "None","{STR,RFX,INT}")
        ("Medium Hafted Point",               "+2d6",   "+3d6",  "0", "Melee",    "Pierce",        "Rapid",           "+1d6", "None", "None","{STR,RFX,INT}")
        ("Medium Hafted Blunt",               "+0d6",   "+1d6",  "4", "Melee",    "Bludgeon",      "Rapid",           "+1d6", "None", "None","{STR,RFX,INT}")
        ("Medium Sword",                      "+1d6",   "+2d6",  "2", "Melee",    "Slash, Pierce", "Rapid",           "+1d6", "None", "None","{STR,RFX,INT}")
        ("Large Hafted Blade",                "+0d6",   "+3d6",  "2", "Melee",    "Hew",           "Rapid",                  "None", "None", "None","{STR,RFX,INT}")
        ("Large Hafted Point",                "+0d6",   "+3d6",  "2", "Melee",    "Pierce",        "Rapid",                  "None", "None", "None","{STR,RFX,INT}")
        ("Large Hafted Blunt",                "-0",  "+1d6",  "5", "Melee",    "Bludgeon",      "Rapid",                  "None", "None", "None","{STR,RFX,INT}")
        ("Large Sword",                       "+2d6",   "+2d6",  "3", "Melee",    "Slash, Pierce", "Rapid",                  "None", "None", "None","{STR,RFX,INT}")
        ("Short Spear",                       "+1d6",   "+3d6",  "3", "Melee",    "Pierce",        "SpearRapid",      "+1d6", "None", "None","{STR,RFX,INT}")
        ("Reach Hafted Axe",                  "Remove 1",      "+4d6",  "3", "Reach",    "Hew",           "Rapid",                  "None", "None", "None","{STR,RFX,INT}")
        ("Reach Hafted Blade",                "Remove 1",      "+4d6",  "3", "Reach",    "Slash",         "Rapid",                  "None", "None", "None","{STR,RFX,INT}")
        ("Reach Hafted Point",                "Remove 1",      "+4d6",  "3", "Reach",    "Pierce",        "Rapid",                  "None", "None", "None","{STR,RFX,INT}")
        ("Reach Hafted Blunt",                "Remove 1",      "+2d6",  "3", "Reach",    "Bludgeon",      "Rapid",                  "None", "None", "None","{STR,RFX,INT}")
        ("Greatsword",                        "Remove 1",      "+3d6",  "4", "Reach",    "Slash, Pierce", "Rapid",                  "None", "None", "None","{STR,RFX,INT}")
        ("Longspear",                         "Remove 1",      "+4d6",  "4", "Reach",    "Pierce",        "SpearRapid",             "None", "None", "None","{STR,RFX,INT}")
        ("Whip",                              "+0d6",   "+0d6",  "0", "Reach",    "Slash",         "Rapid",           "+1d6", "None", "None","{STR,RFX,INT}")
        ("Man Catcher",                       "Remove 3",      "+1d6",  "2", "Reach",    "Bludgeon",      "Rapid",                  "None", "None", "None","{STR,RFX,INT}")
        //("", "", "", "", "", "", "", "None", "None", "None")
    |]

    let conduitClassData = [|
        ("Radiance Conduit", "+1d6", "+0d6", "0", 0, "", "None", "None", "None", "None","{STR,RFX,INT}")
    |]

    let itemTierData = [|
        ("Broken",      -4, 0u,  "0d4",        0u )
        ("Compromised", -3, 0u,  "3d4",        3u )
        ("Damaged",     -2, 0u,  "2d4, 1d6",   6u )
        ("Shoddy",      -1, 0u,  "1d4, 2d6",   9u )
        ("Mundane",     0,  0u,  "3d6",        12u)
        ("Quality",     1,  1u,  "2d6, 1d8",   15u)
        ("Fine",        2,  2u,  "1d6, 2d8",   18u)
        ("Excellent",   3,  3u,  "3d8",        21u)
        ("Superior",    4,  4u,  "2d8, 1d10",  24u)
        ("Exquisite",   5,  5u,  "1d8, 2d10",  27u)
        ("Flawless",    6,  6u,  "3d10",       30u)
        ("Mastercraft", 7,  7u,  "2d10, 1d12", 33u)
        ("Fabled",      8,  8u,  "1d10, 2d12", 36u)
        ("Epic",        9,  9u,  "3d12",       39u)
        ("Legendary",   10, 10u, "2d12, 1d20", 42u)
        ("Mythic",      11, 11u, "1d12, 2d20", 45u)
        ("Artifact",    12, 12u, "3d20",       48u)
    |]

    let itemData = [|
        // WeaponClass Items       
        ("Longspear",                         "Longspear", "Mundane", "12/12",  5.0, "0 cc" )
        ("Dagger",                         "Small Bladed", "Mundane", "12/12",  1.0, "0 cc" )
        ("Arming Sword",                   "Medium Sword", "Mundane", "12/12",  2.0, "0 cc" )
        ("Fine Light Crossbow",          "Light Crossbow", "Mundane", "12/12",  5.0, "0 cc" )
        ("Adversary - Damaged",        "Radiance Conduit",    "Fine", "12/12",  5.0, "0 cc" )
                                                                              
        // MiscClass Items                                            
        ("Bell"        ,                           "Misc", "Mundane",      "",  2.0, "0 cc" )
        ("Ball Bearing",                           "Misc", "Mundane",      "",  2.0, "0 cc" )
                                                                                    
        // WeaponResourceClass Items                                                
        ("Broadhead Arrow",              "Standard Arrow", "Mundane",    "20",  0.0, "0 cc" )
        ("Barbed Broadhead Arrow",       "Wounding Arrow", "Mundane",    "20",  0.0, "0 cc" )
        ("Bodkin Arrow",               "Anti-armor Arrow", "Mundane",    "20",  0.0, "0 cc" )
        ("Wood Tipped Arrow",            "Survival Arrow", "Mundane",    "20",  0.0, "0 cc" )
        ("Bodkin Bolt",                 "Anti-armor Bolt", "Mundane",    "20",  0.0, "0 cc" )
        ("Barbed Broadhead Bolt",         "Wounding Bolt", "Mundane",    "20",  0.0, "0 cc" )
        ("Broadhead Bolt",               "Broadhead Bolt", "Mundane",    "20",  0.0, "0 cc" )
        ("Wood Tipped Bolt",              "Survival Bolt", "Mundane",    "20",  0.0, "0 cc" )
        ("Sling Bullet",           "Standard SlingBullet", "Mundane",    "50",  0.0, "0 cc" )

        // DefenseClass Items
        ("Gaembeson Jacket",               "Phy. Def. 0.5", "Mundane",    "20",  0.0, "0 cc" )
        ("Leather Helmet",                 "Phy. Def. 0.5", "Mundane",    "20",  0.0, "0 cc" )

    |]

    let weaponResourceClassData = [|
        // Arrows
        ("Standard Arrow",              "Arrow",  "+1d6", 1u, "None",        "Pierce",  "None" )
        ("Wounding Arrow",              "Arrow",  "+1d6", 1u, "None", "Pierce, Bleed",  "None" )
        ("Anti-armor Arrow",            "Arrow",  "+1d6", 3u, "None",        "Pierce",  "None" )
        ("Survival Arrow",              "Arrow",  "+1d4", 0u, "None",        "Pierce",  "None" )
        
        // Bolts
        ("Anti-armor Bolt",             "Bolt",  "+1d6",  3u, "None",        "Pierce",  "None" )
        ("Wounding Bolt",               "Bolt",  "+1d6",  1u, "None", "Pierce, Bleed",  "None" )
        ("Broadhead Bolt",              "Bolt",  "+1d6",  1u, "None",        "Pierce",  "None" )
        ("Survival Bolt",               "Bolt",  "+1d4",  0u, "None",        "Pierce",  "None" )

        // Sling Bullets
        ("Standard SlingBullet", "SlingBullet",  "+1d6",  0u, "None",      "Bludgeon",  "None" )
    |]

    let equipmentData = [|
        (true,            "Longspear", 1u)
        (true,         "Arming Sword",  400u )
        (true,  "Fine Light Crossbow",  1u )
        (true,          "Bodkin Bolt", 0u )
        (true,  "Adversary - Damaged",  1u )
        (true,     "Gaembeson Jacket", 1u)
        (true,       "Leather Helmet", 1u)
    |]

    let skillStatData = [|
        ("Endurance",          1, "STR")
        ("Athletics",          3, "STR")
        ("Climb",              1, "STR")
        ("Swim",               2, "STR")
        ("Lift",               -1, "STR")
        ("Perception",         2, "RFX")
        ("Acrobatics",         2, "RFX")
        ("Ride/Pilot",        -1, "RFX")
        ("Sleight of Hand",   -1, "RFX")
        ("Stealth",            0, "RFX")
        ("General Knowledge",  4, "INT")
        ("Willpower",          1, "INT")
        ("Communication",      1, "INT")
        ("Spiritual",          1, "INT")
        ("Survival",           1, "INT")
    |]

    let attributeStatData = [|
        ("STR", -1)
        ("RFX", 1)
        ("INT", 3)
    |]

    let vocationalSkill1Data = [|
        ("Small Bladed", 2)
    |]

    let vocationalSkill2Data = [|
        ("Blazecraft", -1)
        ("Radiance", 4)
    |]

    let vocationalSkill3Data = [|
        //("Blazecraft", 4)
        ("Radiance", 1)
    |]

    let vocationDataArray = [|
        ("Warrior {STR}"          , 2, vocationalSkill1Data)
        (""                       , 0, vocationalSkill2Data)
        ("Fellcraft {STR,RFX,INT}", 2, vocationalSkill3Data)
    |]

    let movementSpeedCalculationData = [|
        ("Humaniod Movement Speed",      30u, "RFX,STR", 10u, "Athletics", 5u )
        ("Flight Movement Speed",        70u, "RFX",     20u, "Athletics", 10u)
        ("Fast 4-Legged Movement Speed", 65u, "RFX",     10u, "Athletics", 5u )
        ("Med. 4-Legged Movement Speed", 50u, "RFX",     10u, "Athletics", 5u )
    |]

    let weightClassData = [|
        // desc                   low%  high%  -att       ft
        ("Light Inventory Weight", 0.0, 0.25, 1.0 )
        ("Medium Inventory Weight", 0.25,  0.5,  0.8 )
        ("Heavy Inventory Weight", 0.5,  1.0,   0.5 )
        ("Overencumberd Inventory Weight", 1.0, 9999999999999.0, 0.0)
    |]

    let carryWeightCalculationData = [|
        // desc                   base  Att. incre. Skill increase
        ("Humaniod Carry Weight", 120u, "STR", 100u, "Lift",      20u )
    |]

    let effectsTableData = [|
        ( "Humaniod Movement Speed", "(Run Character Sheet Calculation)", "-")
        ( "Random ass effect lalal", "(Should be unchanged  lalalalala)", "-")
        ( "Defense Level",           "(Should be unchanged  lalalalala)", "-")
        //( "Level 5 Injury",                         "-1d6 to all checks", "-")
        ( "Inventory Weight",                       "-1d6 to all checks", "-")
    |]

    let defenseClassData = [|
        ("Phy. Def. 0.5",           0.5, 0.0, 0.0)
    |]

    let attributeDeterminedDiceModData = [|
        ("Level 1 Injury", "STR,RFX,INT", "-1")
        ("Level 2 Injury", "STR,RFX,INT", "-2")
        ("Level 3 Injury", "STR,RFX,INT", "-3")
        ("Level 4 Injury", "STR,RFX,INT", "-4")
        ("Level 5 Injury", "STR,RFX,INT", "-5")
        ("Light Inventory Weight",  "STR,RFX", "-0")
        ("Medium Inventory Weight", "STR,RFX", "-1")
        ("Heavy Inventory Weight", "STR,RFX",  "-2")
        ("Overencumberd Inventory Weight", "STR,RFX",  "-4")
    |]