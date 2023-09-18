function isCellLink(sheetName, cell) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    const getRangeData = sheet.getRange(cell)
    const richTextValue = sheet.getRange(cell).getRichTextValue();
    const runs = richTextValue.getRuns();
    
    for (let i = 0; i < runs.length; i++) {
      const linkUrl = runs[i].getLinkUrl();
      if (linkUrl != null) {
        return true;
      }
    }
    
    return false;
  }
  
  function modifiedIsCellLink(cellFromGetRange) {
    const richTextValue = cellFromGetRange.getRichTextValue();
    const runs = richTextValue.getRuns();
    
    for (let i = 0; i < runs.length; i++) {
      const linkUrl = runs[i].getLinkUrl();
      if (linkUrl != null) {
        return true;
      }
    }
    
    return false;
  }
  
  function copyMatchingValues(equipmentNameCells, itemNameCells) {
    var characterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("CharacterSheet");
    var itemData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ItemData");
    
    var characterValues = characterSheet.getRange(equipmentNameCells).getValues();
    var itemValues = itemData.getRange(itemNameCells).getValues();
    
    for (var i = 0; i < characterValues.length; i++) {
      for (var j = 0; j < characterValues[i].length; j++) {
        var characterValue = characterValues[i][j];
        
        for (var k = 0; k < itemValues.length; k++) {
          for (var l = 0; l < itemValues[k].length; l++) {
            var itemValue = itemValues[k][l];
            
            if (characterValue === itemValue && modifiedIsCellLink(itemValues) ) {
              var matchCell = itemData.getRange(k + 1, l + 1);
              var targetCell = characterSheet.getRange(i + 1, j + 1);
              
              var matchValue = matchCell.getValue();
              targetCell.setValue(matchValue);
            }
          }
        }
      }
    }
  }
  
  
  function getSheetData(sheetName, range) {
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName).getRange(range).getValues()
  }
  
  function getFilteredSheetData(sheetName, range){
    return getSheetData(sheetName, range).filter(row => row[0] != "")
  }
  
  function setSheetData(sheetName, range, data) {
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName).getRange(range).setValues(data)
  }
  
  function getNonEmptyStringIndexes(strings) {
    var indexes = [];
    
    for (var i = 0; i < strings.length; i++) {
      if (strings[i] !== '') {
        indexes.push(i);
      }
    }
    
    return indexes;
  }
  
  function createDamageTypeMap() {
    let damageData = getFilteredSheetData("DamageTypeData", "A2:A22").flat()
    const DamageData_damageTypeMap = Damage_createDamageTypeMap(damageData);
  
    return DamageData_preloadedStringsToDamageTypes = (damageTypesString) => Damage_stringToDamageTypeArray(DamageData_damageTypeMap, damageTypesString);
  }
  
  function combatRollsToSheet (combatRolls, headerCellsString, targetCellsString){
    let headers = getSheetData("CharacterSheet", headerCellsString).flat()
  
    let keyIntoBigArray = getNonEmptyStringIndexes(headers)
  
    let convertedCombatRolls = combatRolls.map((combatRoll) => {
      let newBigArray = Array(headers.length)
      keyIntoBigArray.map( (indexIntoBig, index) => {
        newBigArray[indexIntoBig] = combatRoll[index]
      })
      return newBigArray
    })
  
    let combatRollCells = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("CharacterSheet").getRange(targetCellsString)
  
    let setArray = Array( combatRollCells.getNumRows() ).fill().map(() => Array( headers.length));
  
  
    setArray = setArray.map( (_, index) => {
      if(index < convertedCombatRolls.length)
        return convertedCombatRolls[index]
      else
        return Array(headers.length)
    })
  
    setSheetData("CharacterSheet", targetCellsString, setArray)
  }
  
  // Given an array (google sheets cells), sums up how many evaluate to "true"
  function sumTrueCheckboxes(array){
    return array.flat().reduce( (numTrue, checkbox) => checkbox ? numTrue + 1 : numTrue, 0)
  }
  
  //Given the cells corresponding to positive and negative skill increases, returns the number of skill points
  function getSkillPoints(posSkillPointsCells, negSkillPointsCells) {
    // grabs the cell data for the positive and negative skill point checkboxes
    // Sums the number of positive and negative skill points
    return sumTrueCheckboxes(getSheetData("CharacterSheet", posSkillPointsCells)) - sumTrueCheckboxes(getSheetData("CharacterSheet", negSkillPointsCells))
  }
  
  function getMultipleSkillPoints (posSkillPointsCells, negSkillPointsCells) {
    let posCheckboxesArray = getSheetData("CharacterSheet", posSkillPointsCells)
    let negCheckboxesArray = getSheetData("CharacterSheet", negSkillPointsCells)
  
    return map2( ((negCheckbox, posCheckboxes) => {
      return sumTrueCheckboxes(posCheckboxes) - sumTrueCheckboxes(negCheckbox)
    }), negCheckboxesArray, posCheckboxesArray )
  }
  
  function createVocationStatsFromSheet () {
  
      let vocationDesc1       = getSheetData("CharacterSheet","AS5:AX5")[0][0]
      let vocationLvl1        = getSkillPoints('BC5:BF5','BA5')
      let skillDescs1         = getSheetData("CharacterSheet","AS6:AX10").map( data => data[0])
      let skillLvls1          = new Int32Array(getMultipleSkillPoints("BC6:BF10","BA6:BA10"))
  
      return [ VocationStat_makeVocation(vocationDesc1,vocationLvl1,skillDescs1,skillLvls1),]
  }
  
  function getSinglSheetData( cell ) {
    return getSheetData("CharacterSheet",cell)[0][0]
  }
  
  function getSinglSheetDataFromAnySheet( sheetName, cell ) {
    return getSheetData(sheetName,cell)[0][0]
  }
  
  function getEquipment (itemMap) {
    let equipedColumn = getSheetData("CharacterSheet", "B31:B50").map((data)=>data[0])
    let equipmentDescColumn = getSheetData("CharacterSheet", "D31:D50").map((data)=>data[0])
    return Equipment_createEquipmentArray(equipedColumn, equipmentDescColumn, itemMap);
  }
  
  function getSheetDataWithHeaders ( sheetName, headerCellsString, targetData) {
    let headers = getSheetData(sheetName, headerCellsString).flat()
  
    let keysIntoBigArray = getNonEmptyStringIndexes(headers)
    
    let temp = getSheetData(sheetName, targetData)
    
    return temp.map( (data) => {
      return keysIntoBigArray.map( key => data[key])
    })
  }
  
  function getEffectSheetData (headerCellsString, targetData) {
    return getSheetDataWithHeaders("CharacterSheet", headerCellsString, targetData)
  }
  
  function combineLists(list1, list2) {
    if (list1.length !== list2.length) {
      throw new Error("Lists must have equal length");
    }
  
    return list1.map((element, index) => element.concat(list2[index]));
  }
  
  function determineIfContainerIsOnPerson (sheetName, cell, headerCellsString, targetCellString ) {
    if ( getSinglSheetDataFromAnySheet(sheetName, cell) ){
      let data = getSheetDataWithHeaders(sheetName, headerCellsString, targetCellString).filter( element => element[1] != "")
      let dataWithFalsePrefixed = data.map( innerData => [false].concat(innerData))
      return dataWithFalsePrefixed
    }
    else
      return []
  }
  
  
  function main () {
  
    let damageTypeData                     = getFilteredSheetData ("DamageTypeData", "A2:A1000").map( (data) => data[0])
    let penetrationCalculationData         = getFilteredSheetData ("PenetrationCalculationData", "A2:B1000")
    let engageableOpponentsCalculationData = getFilteredSheetData ("EngageableOpponentsCalculationData", "A2:C1000")
    let calculatedEngageableOpponentsData  = getFilteredSheetData ("CalculatedEngageableOpponentsData", "A2:B1000")
    let rangeCalculationData               = getFilteredSheetData ("RangeCalculationData", "A2:E1000")
    let calculatedRangeData                = getFilteredSheetData ("CalculatedRangeData", "A2:C1000")
    let resourceClassData                  = getFilteredSheetData ("ResourceClassData", "A2:A1000").map( (data) => data[0])
    let attributeData                      = getFilteredSheetData ("AttributeData", "A2:A1000").map( (data) => data[0])
    let magicSkillData                     = getFilteredSheetData ("MagicSkillData", "A2:E1000")
    let magicCombatData                    = getFilteredSheetData ("MagicCombatData", "A2:I1000")
    let weaponClassData                    = getFilteredSheetData ("WeaponClassData", "A2:K1000")
    let weaponResourceClassData            = getFilteredSheetData ("WeaponResourceClassData", "A2:G1000")
    let conduitClassData                   = getFilteredSheetData ("ConduitClassData", "A2:K1000")
    let itemTierData                       = getFilteredSheetData ("ItemTierData", "A2:E1000")
    let defenseClass                       = getFilteredSheetData ("DefenseClassData", "A2:D1000")
  
    let itemData                           = getFilteredSheetData ("ItemData", "A2:F3000")
    
    let container1 = determineIfContainerIsOnPerson("Equipment, Containers, & Off-person Storage", "F54", "B56:AP56", "B57:AP104")
    let container2 = determineIfContainerIsOnPerson("Equipment, Containers, & Off-person Storage", "F106", "B108:AP108", "B109:AP156")
    let container3 = determineIfContainerIsOnPerson("Equipment, Containers, & Off-person Storage", "F158", "B160:AP160", "B161:AP208")
  
    let equipmentData = getSheetDataWithHeaders("Equipment, Containers, & Off-person Storage", "B4:AQ4", "B5:AQ52").filter( element => element[1] != "").concat(container1).concat(container2).concat(container3)
  
    let movementSpeedData                  = getFilteredSheetData ("MovementSpeedCalculationData", "A2:F1000")
    let effectsTableData                   = getEffectSheetData ("B27:AZ27", "B28:AZ48")
    let attributeDeterminedDiceModData     = getFilteredSheetData ("AttributeDeterminedDiceModData", "A2:C1000")
    let carryWeightCalculationData         = getFilteredSheetData ("CarryWeightCalculationData", "A2:F1000")
    let weightClassData                    = getFilteredSheetData ("WeightClassData", "A2:D1000")
  
    let attribute1 = getSinglSheetData("B5")  // STR
    let attribute2 = getSinglSheetData("S5")  // RFX
    let attribute3 = getSinglSheetData("AJ5") // INT
  
    let attributeStatData = [
      [ attribute1,  getSkillPoints('O5:R5', 'M5')    ],
      [ attribute2,  getSkillPoints('AF5:AI5', 'AD5')   ],
      [ attribute3,  getSkillPoints('AW5:AZ5', 'AU5') ],
    ]
  
    let skillStatData                      = [
      ["Athletics",         getSkillPoints('O6:R6', 'M6'),       attribute1],
      ["Climb",             getSkillPoints('O7:R7', 'M7'),       attribute1],
      ["Endurance",         getSkillPoints('O8:R8', 'M8'),       attribute1],
      ["Lift",              getSkillPoints('O9:R9', 'M9'),       attribute1],
  
      ["Acrobatics",        getSkillPoints('AF6:AI6', 'AD6'),      attribute2],
      ["Perception",        getSkillPoints('AF7:AI7', 'AD7'),      attribute2],
      ["Sleight of Hand",   getSkillPoints('AF8:AI8', 'AD8'),      attribute2],
      ["Stealth",           getSkillPoints('AF9:AI9', 'AD9'),      attribute2],
  
      ["Communication",     getSkillPoints('AW6:AZ6', 'AU6'),    attribute3],
      ["General Knowledge", getSkillPoints('AW7:AZ7', 'AU7'),    attribute3],
      ["Survival",          getSkillPoints('AW8:AZ8', 'AU8'),    attribute3],
      ["Willpower",         getSkillPoints('AW9:AZ9', 'AU9'),    attribute3],
    ];
  
    let vocationalSkill1Data = [
      [ getSinglSheetData("B13"),  getSkillPoints('O13:R13',   'M13')  ],
      [ getSinglSheetData("B14"),  getSkillPoints('O14:R14',   'M14')  ],
      [ getSinglSheetData("B15"),  getSkillPoints('O15:R15',   'M15')  ],
      [ getSinglSheetData("B16"),  getSkillPoints('O16:R16',   'M16')  ],
      [ getSinglSheetData("B17"),  getSkillPoints('O17:R17',   'M17')  ],
      [ getSinglSheetData("B18"),  getSkillPoints('O18:R18',   'M18')  ],
      [ getSinglSheetData("B19"),  getSkillPoints('O19:R19',   'M19')  ],
      [ getSinglSheetData("B20"),  getSkillPoints('O20:R20',   'M20')  ],
      [ getSinglSheetData("B21"),  getSkillPoints('O21:R21',   'M21')  ],
      [ getSinglSheetData("B22"),  getSkillPoints('O22:R22',   'M22')  ],
      [ getSinglSheetData("B23"),  getSkillPoints('O23:R23',   'M23')  ],
      [ getSinglSheetData("B24"),  getSkillPoints('O24:R24',   'M24')  ],
    ]
  
    let vocationalSkill2Data = [
      [ getSinglSheetData("S13"),  getSkillPoints('AF13:AI13',   'AD13')  ],
      [ getSinglSheetData("S14"),  getSkillPoints('AF14:AI14',   'AD14')  ],
      [ getSinglSheetData("S15"),  getSkillPoints('AF15:AI15',   'AD15')  ],
      [ getSinglSheetData("S16"),  getSkillPoints('AF16:AI16',   'AD16')  ],
      [ getSinglSheetData("S17"),  getSkillPoints('AF17:AI17',   'AD17')  ],
      [ getSinglSheetData("S18"),  getSkillPoints('AF18:AI18',   'AD18')  ],
      [ getSinglSheetData("S19"),  getSkillPoints('AF19:AI19',   'AD19')  ],
      [ getSinglSheetData("S20"),  getSkillPoints('AF20:AI20',   'AD20')  ],
      [ getSinglSheetData("S21"),  getSkillPoints('AF21:AI21',   'AD21')  ],
      [ getSinglSheetData("S22"),  getSkillPoints('AF22:AI22',   'AD22')  ],
      [ getSinglSheetData("S23"),  getSkillPoints('AF23:AI23',   'AD23')  ],
      [ getSinglSheetData("S24"),  getSkillPoints('AF24:AI24',   'AD24')  ],
    ]
  
    let vocationalSkill3Data = [
      [ getSinglSheetData("S13"),  getSkillPoints('AF13:AI13',   'AD13')  ],
      [ getSinglSheetData("S14"),  getSkillPoints('AF14:AI14',   'AD14')  ],
      [ getSinglSheetData("S15"),  getSkillPoints('AF15:AI15',   'AD15')  ],
      [ getSinglSheetData("S16"),  getSkillPoints('AF16:AI16',   'AD16')  ],
      [ getSinglSheetData("S17"),  getSkillPoints('AF17:AI17',   'AD17')  ],
      [ getSinglSheetData("S18"),  getSkillPoints('AF18:AI18',   'AD18')  ],
      [ getSinglSheetData("S19"),  getSkillPoints('AF19:AI19',   'AD19')  ],
      [ getSinglSheetData("S20"),  getSkillPoints('AF20:AI20',   'AD20')  ],
      [ getSinglSheetData("S21"),  getSkillPoints('AF21:AI21',   'AD21')  ],
      [ getSinglSheetData("S22"),  getSkillPoints('AF22:AI22',   'AD22')  ],
      [ getSinglSheetData("S23"),  getSkillPoints('AF23:AI23',   'AD23')  ],
      [ getSinglSheetData("S24"),  getSkillPoints('AF24:AI24',   'AD24')  ],
    ]
  
    /*
    let vocationalSkill4Data = [
      [ getSinglSheetData("S13"),  getSkillPoints('AF13:AI13',   'AD13')  ],
      [ getSinglSheetData("S14"),  getSkillPoints('AF14:AI14',   'AD14')  ],
      [ getSinglSheetData("S15"),  getSkillPoints('AF15:AI15',   'AD15')  ],
      [ getSinglSheetData("S16"),  getSkillPoints('AF16:AI16',   'AD16')  ],
      [ getSinglSheetData("S17"),  getSkillPoints('AF17:AI17',   'AD17')  ],
      [ getSinglSheetData("S18"),  getSkillPoints('AF18:AI18',   'AD18')  ],
      [ getSinglSheetData("S19"),  getSkillPoints('AF19:AI19',   'AD19')  ],
      [ getSinglSheetData("S20"),  getSkillPoints('AF20:AI20',   'AD20')  ],
      [ getSinglSheetData("S21"),  getSkillPoints('AF21:AI21',   'AD21')  ],
      [ getSinglSheetData("S22"),  getSkillPoints('AF22:AI22',   'AD22')  ],
      [ getSinglSheetData("S23"),  getSkillPoints('AF23:AI23',   'AD23')  ],
      [ getSinglSheetData("S24"),  getSkillPoints('AF24:AI24',   'AD24')  ],
    ]
    */
  
    let vocationDataArray = [
      [ getSinglSheetData("B12"),  getSkillPoints('O12:R12',    'M12'),  vocationalSkill1Data],
      [ getSinglSheetData("S12"),  getSkillPoints('AF12:AI12',  'AD12'), vocationalSkill2Data],
      [ getSinglSheetData("AJ12"), getSkillPoints('AW12:AZ12', 'AU12'),  vocationalSkill3Data],
      //[ getSinglSheetData("BA12"), getSkillPoints('BN12:BQ12', 'BL12'),  vocationalSkill4Data],
    ]
  
    const Character = BuildRules_buildRules(damageTypeData, penetrationCalculationData, calculatedEngageableOpponentsData, engageableOpponentsCalculationData, calculatedRangeData, rangeCalculationData, resourceClassData, attributeData, magicSkillData, magicCombatData, weaponClassData, conduitClassData, itemTierData, itemData, weaponResourceClassData, equipmentData, skillStatData, attributeStatData, movementSpeedData, vocationDataArray, effectsTableData, defenseClass, attributeDeterminedDiceModData, carryWeightCalculationData, weightClassData);
  
    function vocationRollsToSheet (vocationRoll, vocationDescColumnString, vocationDescRowNumber) {
      let temp = vocationDescColumnString + vocationDescRowNumber
      setSheetData("CharacterSheet", temp,    [[Dice_dicePoolToString(vocationRoll.vocationDicePool)]])
      let vocationalSkillRowNumber = vocationDescRowNumber + 1
  
      vocationRoll.vocationalSkills.reduce ((acc, vocationSkill) => {
        let newCellNumber = vocationalSkillRowNumber + acc
        let cellString = vocationDescColumnString + newCellNumber
        setSheetData("CharacterSheet", cellString, [[Dice_dicePoolToString(vocationSkill.dicePool)]])
        return acc + 1
      }, 0)
    }
  
    //[[Dice_dicePoolToString(Character.vocationRolls[0].vocationDicePool)]]
  
    if (Character.vocationRolls.length > 0)
      vocationRollsToSheet(Character.vocationRolls[0], "K", 12)
    if (Character.vocationRolls.length > 1)
      vocationRollsToSheet(Character.vocationRolls[1], "AB", 12)
    if (Character.vocationRolls.length > 2)
      vocationRollsToSheet(Character.vocationRolls[2], "AS", 12)
    /*
    if (Character.vocationRolls.length > 3)
      vocationRollsToSheet(Character.vocationRolls[3], "BJ", 12)
    */
  
    setSheetData("CharacterSheet", "K6",   [[Dice_dicePoolToString(Character.coreSkillRolls[0].dicePool)]])  //Athletics
    setSheetData("CharacterSheet", "K7",   [[Dice_dicePoolToString(Character.coreSkillRolls[1].dicePool)]])  //Climb
    setSheetData("CharacterSheet", "K8",   [[Dice_dicePoolToString(Character.coreSkillRolls[2].dicePool)]])  //Endurance
    setSheetData("CharacterSheet", "K9",   [[Dice_dicePoolToString(Character.coreSkillRolls[3].dicePool)]])  //Lift
  
    setSheetData("CharacterSheet", "AB6",   [[Dice_dicePoolToString(Character.coreSkillRolls[4].dicePool)]])  //Acrobatics
    setSheetData("CharacterSheet", "AB7",   [[Dice_dicePoolToString(Character.coreSkillRolls[5].dicePool)]])  //Perception
    setSheetData("CharacterSheet", "AB8",   [[Dice_dicePoolToString(Character.coreSkillRolls[6].dicePool)]])  //Sleight of Hand
    setSheetData("CharacterSheet", "AB9",   [[Dice_dicePoolToString(Character.coreSkillRolls[7].dicePool)]])  //Stealth
  
    setSheetData("CharacterSheet", "AS6",  [[Dice_dicePoolToString(Character.coreSkillRolls[8].dicePool) ]]) //Communication
    setSheetData("CharacterSheet", "AS7",  [[Dice_dicePoolToString(Character.coreSkillRolls[9].dicePool) ]]) //General Knowledge
    setSheetData("CharacterSheet", "AS8",  [[Dice_dicePoolToString(Character.coreSkillRolls[10].dicePool)]]) //Survival
    setSheetData("CharacterSheet", "AS9",  [[Dice_dicePoolToString(Character.coreSkillRolls[11].dicePool)]]) //Willpower
  
    combatRollsToSheet(CombatRoll_combatRollsToStringArrays(Character.combatRolls), "B51:BK51", "B52:BK123")
  
    // For calculated Effect table
    combatRollsToSheet(Character.calculatedEffectTable, "B27:AZ27", "B312:AZ332")
  
  }
  