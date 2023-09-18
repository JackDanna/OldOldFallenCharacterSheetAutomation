namespace TestingSuite

module Testing =
    open FallenLib.BuildRules
    open FallenData.Data

    let javk = buildRules damageTypeData penetrationCalculationData calculatedEngageableOpponentsData 
                   engageableOpponentsCalculationData calculatedRangeData rangeCalculationData resourceClassData
                   attributeData  magicSkillData magicCombatData weaponClassData conduitClassData itemTierData itemData  
                   weaponResourceClassData equipmentData skillStatData attributeStatData
                   movementSpeedCalculationData vocationDataArray effectsTableData defenseClassData attributeDeterminedDiceModData
                   carryWeightCalculationData weightClassData

    let x = 5