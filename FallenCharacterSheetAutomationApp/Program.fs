namespace TestingSuite

module Testing =
    open FallenLib.BuildRules
    open FallenData.Data

    let javk = 
        buildRules 
            damageTypeData
            penetrationCalculationData
            calculatedEngageableOpponentsData 
            engageableOpponentsCalculationData
            calculatedRangeData
            rangeCalculationData
            resourceClassData
            attributeData
            magicSkillData
            magicCombatData
            weaponClassData
            conduitClassData
            itemTierData
            itemData  
            weaponResourceClassData
            equipmentData
            skillStatData
            attributeStatData
            movementSpeedCalculationData 
            vocationDataArray 
            effectsTableData 
            defenseClassData 
            attributeDeterminedDiceModData
            carryWeightCalculationData 
            weightClassData

    // Just a line for setting a breakpoint to see the results
    let x = 5