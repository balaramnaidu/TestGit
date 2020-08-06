import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { FormControl, FormArray, FormGroup, FormBuilder } from '@angular/forms';
import { ModelingService } from './modeling.service';
import { AppConstants } from './../../shared/constants';
import { Region } from './../../interface/initiative-model';
import { MedHistory, DateRange, FromTheraClass, ToTheraClass,
   ConvertedData, ModelingCalculationDetails } from './../../interface/cogs-modeling';
import { ModelingInfo } from './../../interface/modeling-info';

@Component({
  selector: 'app-modeling',
  templateUrl: './modeling.component.html',
  styleUrls: ['./modeling.component.scss']
})
export class ModelingComponent implements OnInit {

  @Input() userform: FormGroup;
  @Input() editId: number;
  @Input() invalidateModel: boolean;
  @Input() regions: Region[];
  @Output() setCalculate = new EventEmitter();
  @Output() setCalculationData = new EventEmitter();
  viewByForm: FormGroup;
  showPopup = false;
  helpDisplay = false;
  summaryDisplay = false;
  isCalculate = false;
  isSelectedPref = false;
  isLoadedRegions = false;
  showSpinner = false;
  selectedView = false;
  defaultColspan = 6;
  selectedStateName: string;
  nonPreferredRow: MedHistory[];
  nonPreferredData: MedHistory[];
  preferredData: MedHistory[];
  fromDataConvertion: MedHistory[];
  toDataConvertion: MedHistory[];
  fromDataFullConvertion: MedHistory[];
  toDataFullConvertion: MedHistory[];
  fromTheraData: string;
  toTheraData: string;
  modelingCalculationDetails: ModelingCalculationDetails;
  selectedIndex: any[];
  StatesData: Region[];
  errorMsg = AppConstants.ErrorMessages;
  dateRange: DateRange;

  hideShowTableColumns = {
    1: true,
    2: true,
    3: true
  };

  constructor(fb: FormBuilder,
              modelingService: ModelingService) {
      this.nonPreferredData = [];
      this.fromDataFullConvertion = [];
      this.toDataFullConvertion = [];
      this.preferredData = [];
      this.selectedIndex = [];
      this.nonPreferredRow = [];
  }

  ngOnInit(): void {
    this.StatesData = [{
      id: 'KP',
      name: 'National'
    }];
    this.regions.forEach(val => {
      this.StatesData.push(val);
    });
    this.viewByForm = this.fb.group({
      items: this.fb.array([]),
    });
    this.setRegions();
  }

  // tslint:disable-next-line:use-lifecycle-interface
  ngOnChanges(item: SimpleChanges): void {
    if (item.invalidateModel && (item.invalidateModel.currentValue === false && item.invalidateModel.previousValue === true)) {
      this.isCalculate = false;
    }
  }

  setRegions() {
    for (const key of Object.keys(this.StatesData)) {
      if (this.StatesData[key].id === 'KP') {
        this.userform.controls.regionsSelected.setValue([this.StatesData[key]]);
      }
    }
  }

  hideShowColumns(fieldNo: number) {
    this.hideShowTableColumns[fieldNo] = !this.hideShowTableColumns[fieldNo];
  }

  checkedRow(isChecked: boolean, row: MedHistory, rowIndex: number, regionIndex: number) {
    this.selectedIndex[regionIndex] = null;
    if (isChecked) {
      this.nonPreferredRow[regionIndex] = row;
    } else {
      this.removeModelingRow(row, regionIndex);
    }
  }

  selectedItem(row: MedHistory, rowIndex: number, regionIndex: number) {
    const control = this.viewByForm.get('items')['controls'][regionIndex].get('convertedData');
    const i = control.value.length;
    const preferredRow = row;
    if (this.nonPreferredRow[regionIndex]) {
      this.setupConvertedDataControls(regionIndex, preferredRow);
      const pushedRow = this.setupConvertedDataValues(regionIndex, preferredRow);
      this.simpleCalculations(pushedRow, regionIndex, i);
      this.selectedIndex[regionIndex] = rowIndex;
      this.setConvertedData(pushedRow);
      this.setupTimeout(regionIndex);
    }
  }

  setupTimeout(regionIndex: number) {
    this.isSelectedPref = true;
    setTimeout(() => {
      this.isSelectedPref = false;
      this.nonPreferredRow[regionIndex] = null;
    }, 1000);
  }

  setupConvertedDataControls(regionIndex: number,  preferredRow: MedHistory) {
    const prefCostValue = preferredRow.costPerRxNr;
    const percentConNewVolumeValue = 90;
    const control = this.viewByForm.get('items')['controls'][regionIndex].get('convertedData') as FormArray;
    control.push(this.fb.group({
      uniqueId: new FormControl(this.nonPreferredRow[regionIndex].uniqueId),
      nonPrefMedHistory: this.fb.group(this.nonPreferredRow[regionIndex]),
      prefMedHistory: this.fb.group(preferredRow),
      nonPrefCost: new FormControl(this.nonPreferredRow[regionIndex].costPerRxNr),
      prefCost: new FormControl(prefCostValue),
      nonPrefPercentVolumeIncrease: new FormControl(0),
      nonPrefVolumeIncreaseRx: new FormControl(this.nonPreferredRow[regionIndex].totalRx),
      percentConExistingVolume: new FormControl(80),
      percentConNewVolume: new FormControl(percentConNewVolumeValue),
      savings: new FormControl(0),
      savingsExistingVolume: new FormControl(0),
      costAvoidance: new FormControl(0),
      last12mosData: new FormControl(),
      next12mosNoConvertionData: new FormControl(),
      next12mosConvertionData: new FormControl(),
      modelingCalculationDetails: new FormControl(),
      nonPrefLast12MosCost: new FormControl(0),
      nonPrefNext12MosCostNoConvertion: new FormControl(0),
      next12MosWithConvertion: new FormControl(0),
    }));
  }

  setupConvertedDataValues(regionIndex: number,  preferredRow: MedHistory) {
    const prefCostValue = preferredRow.costPerRxNr;
    const percentConNewVolumeValue = 90;
    const pushedRow = {
      uniqueId: this.nonPreferredRow[regionIndex].uniqueId,
      nonPrefMedHistory: this.nonPreferredRow[regionIndex],
      prefMedHistory: preferredRow,
      nonPrefPercentVolumeIncrease: 0,
      nonPrefVolumeIncreaseRx: this.nonPreferredRow[regionIndex].totalRx,
      nonPrefCost: this.nonPreferredRow[regionIndex].costPerRxNr,
      prefCost: prefCostValue,
      percentConExistingVolume: 80,
      percentConNewVolume: percentConNewVolumeValue,
      savings: 0,
      savingsExistingVolume: 0,
      costAvoidance: 0,
      last12mosData: 0,
      modelingCalculationDetails: null,
      next12mosNoConvertionData: 0,
      next12mosConvertionData: 0,
      nonPrefLast12MosCost: 0,
      nonPrefNext12MosCostNoConvertion: 0,
      next12MosWithConvertion: 0,
    };
    return pushedRow;
  }

  setConvertedData(pushedRow: ConvertedData) {
    const formValue = this.viewByForm.value.items;
    for (const formKey of Object.keys(formValue)) {
      const cloneRow = JSON.parse(JSON.stringify(pushedRow));
      if (formValue[formKey].regionCd !== 'KP') {
        const control = this.viewByForm.get('items')['controls'][formKey].get('convertedData') as FormArray;
        const i = this.viewByForm.value.items[formKey].convertedData.length;
        let isNonPrefrredRowFound = false;
        for (const nonPrefKey of Object.keys(this.nonPreferredData)) {
          if (this.nonPreferredData[nonPrefKey].region === formValue[formKey].regionCd) {
            if (pushedRow.nonPrefMedHistory.medIdCd === this.nonPreferredData[nonPrefKey].medIdCd &&
              pushedRow.nonPrefMedHistory.qntyNr === this.nonPreferredData[nonPrefKey].qntyNr &&
              pushedRow.nonPrefMedHistory.daysNr === this.nonPreferredData[nonPrefKey].daysNr) {
              cloneRow.nonPrefMedHistory.costPerRxNr = this.nonPreferredData[nonPrefKey].costPerRxNr;
              cloneRow.nonPrefMedHistory.totalRx = this.nonPreferredData[nonPrefKey].totalRx;
              cloneRow.nonPrefMedHistory.totalCost = this.nonPreferredData[nonPrefKey].totalCost;
              isNonPrefrredRowFound = true;
            }
          }
        }
        if (!isNonPrefrredRowFound) {
          return false;
        }
        for (const prefKey of Object.keys(this.preferredData)) {
          if (this.preferredData[prefKey].region === formValue[formKey].regionCd) {
            if (pushedRow.nonPrefMedHistory.medIdCd === this.preferredData[prefKey].medIdCd &&
              pushedRow.prefMedHistory.qntyNr === this.preferredData[prefKey].qntyNr &&
              pushedRow.prefMedHistory.daysNr === this.preferredData[prefKey].daysNr) {
              cloneRow.prefMedHistory.costPerRxNr = this.preferredData[prefKey].costPerRxNr;
            }
          }
        }
        this.setupFormControls(cloneRow, control);
        this.simpleCalculations(cloneRow, Number(formKey), i);
      }
    }
  }

  setupFormControls(cloneRow: ConvertedData, control: FormArray) {
    control.push(this.fb.group({
      uniqueId: new FormControl(cloneRow.uniqueId),
      nonPrefMedHistory: this.fb.group(cloneRow.nonPrefMedHistory),
      prefMedHistory: this.fb.group(cloneRow.prefMedHistory),
      nonPrefPercentVolumeIncrease: new FormControl(cloneRow.nonPrefPercentVolumeIncrease),
      nonPrefVolumeIncreaseRx: new FormControl(cloneRow.nonPrefVolumeIncreaseRx),
      nonPrefCost: new FormControl(cloneRow.nonPrefCost),
      prefCost: new FormControl(cloneRow.prefCost),
      percentConExistingVolume: new FormControl(cloneRow.percentConExistingVolume),
      percentConNewVolume: new FormControl(cloneRow.percentConNewVolume),
      savings: new FormControl(cloneRow.savings),
      savingsExistingVolume: new FormControl(cloneRow.savingsExistingVolume),
      costAvoidance: new FormControl(cloneRow.costAvoidance),
      last12mosData: new FormControl(),
      next12mosNoConvertionData: new FormControl(),
      next12mosConvertionData: new FormControl(),
      modelingCalculationDetails: new FormControl(cloneRow.modelingCalculationDetails),
      nonPrefLast12MosCost: new FormControl(cloneRow.nonPrefLast12MosCost),
      nonPrefNext12MosCostNoConvertion: new FormControl(cloneRow.nonPrefNext12MosCostNoConvertion),
      next12MosWithConvertion: new FormControl(cloneRow.next12MosWithConvertion),
    }));
  }

  updateCalculation(pushedRow: ConvertedData, regionIndex: number, i: number) {
    const formValue = this.viewByForm.value.items;
    for (const formKey of Object.keys(formValue)) {
      if (formValue[formKey].regionCd !== 'KP') {
        const convertedData = formValue[formKey].convertedData;
        for (const convertedKey of Object.keys(convertedData)) {
          const cloneRow = convertedData[convertedKey];
          if (pushedRow.nonPrefMedHistory.medIdCd === convertedData[convertedKey].nonPrefMedHistory.medIdCd &&
            pushedRow.nonPrefMedHistory.qntyNr === convertedData[convertedKey].nonPrefMedHistory.qntyNr &&
            pushedRow.nonPrefMedHistory.daysNr === convertedData[convertedKey].nonPrefMedHistory.daysNr) {
              cloneRow.nonPrefPercentVolumeIncrease = pushedRow.nonPrefPercentVolumeIncrease;
              cloneRow.nonPrefCost = pushedRow.nonPrefCost;
              cloneRow.prefCost = pushedRow.prefCost;
              cloneRow.percentConExistingVolume = pushedRow.percentConExistingVolume;
              cloneRow.percentConNewVolume = pushedRow.percentConNewVolume;
              const convertedControl = this.viewByForm.get('items')['controls'][formKey].get('convertedData')['controls'][convertedKey];
              this.updateConvertedData(convertedControl, cloneRow);
              this.simpleCalculations(cloneRow, Number(formKey), Number(convertedKey));
          }
        }
      }
    }
  }

  updateConvertedData(convertedControl: FormGroup, cloneRow: ConvertedData) {
    if (convertedControl.controls.nonPrefMedHistory && convertedControl.controls.nonPrefMedHistory.get('uniqueId')) {
      convertedControl.controls.nonPrefPercentVolumeIncrease.setValue(cloneRow.nonPrefPercentVolumeIncrease);
      convertedControl.controls.nonPrefCost.setValue(cloneRow.nonPrefCost);
      convertedControl.controls.prefCost.setValue(cloneRow.prefCost);
      convertedControl.controls.percentConExistingVolume.setValue(cloneRow.percentConExistingVolume);
      convertedControl.controls.percentConNewVolume.setValue(cloneRow.percentConNewVolume);
    }
  }

  removeModelingRow(row: MedHistory, regionIndex: number) {
    this.nonPreferredRow[regionIndex] = null;
    const formValue = this.viewByForm.value.items;
    for (const formKey of Object.keys(formValue)) {
      this.removeConvertedDataRow(row, Number(formKey), formValue[formKey].convertedData);
      this.unCheckNonPreferredRow(row, Number(formKey), formValue[formKey].nonPreferredData);
      this.calculateTotals(Number(formKey));
    }
  }

  removeConvertedDataRow(row: MedHistory, formKey: number, convertedData: ConvertedData) {
    for (const key of Object.keys(convertedData)) {
      if (convertedData[key].uniqueId === row.uniqueId) {
        this.viewByForm.get('items')['controls'][formKey].get('convertedData').removeAt(key);
      }
    }
  }

  unCheckNonPreferredRow(row: MedHistory, formKey: number, nonPreferredData: MedHistory) {
    for (const nonPrefKey of Object.keys(nonPreferredData)) {
      if (nonPreferredData[nonPrefKey].uniqueId === row.uniqueId) {
        this.viewByForm.get('items')['controls'][formKey].get('nonPreferredData').controls[nonPrefKey].controls.isChecked.setValue(false);
      }
    }
  }

  showDetails(regionIndex: number, i: number) {
    const formValue = this.viewByForm.value.items;
    this.modelingCalculationDetails = formValue[regionIndex].convertedData[i].modelingCalculationDetails;
    this.selectedStateName = formValue[regionIndex].regionDe;
    this.showPopup = true;
  }

  simpleCalculations(controlValue: ConvertedData, regionIndex: number, rowNumber: number) {
    const selectedPairs = controlValue;
    const defaultControl = this.viewByForm.get('items')['controls'][regionIndex].get('convertedData')['controls'][rowNumber].controls;
    if (!defaultControl.nonPrefMedHistory.controls.costPerRxNr) {
      return false;
    }
    this.setEditableNumbers(controlValue, regionIndex, rowNumber);
    const a = selectedPairs.nonPrefMedHistory.totalRx * (selectedPairs.nonPrefPercentVolumeIncrease / 100) +
      selectedPairs.nonPrefMedHistory.totalRx;
    selectedPairs.nonPrefVolumeIncreaseRx = a;
    defaultControl.nonPrefVolumeIncreaseRx.setValue(a.toFixed(2));
    const nonPrefRxVolume = selectedPairs.nonPrefMedHistory.totalRx;
    const nonPrefLast12MosCost = Math.round(nonPrefRxVolume * selectedPairs.nonPrefMedHistory.costPerRxNr);
    const nonPrefNext12MosCostNoConvertion = Math.round(selectedPairs.nonPrefVolumeIncreaseRx * selectedPairs.nonPrefCost);
    const convertedExistingVolumeNumber = (nonPrefRxVolume * selectedPairs.percentConExistingVolume) / 100;
    const convertedNewVolumeNumber = (((nonPrefRxVolume * selectedPairs.nonPrefPercentVolumeIncrease) / 100 *
      selectedPairs.percentConNewVolume) / 100);
    const nonconexistingVolumeNumber = nonPrefRxVolume - convertedExistingVolumeNumber;
    const nonconnewVolumeNumber = ((selectedPairs.nonPrefVolumeIncreaseRx - nonPrefRxVolume) *
      (100 - selectedPairs.percentConNewVolume) / 100);
    const totalVolume = convertedExistingVolumeNumber + convertedNewVolumeNumber + nonconexistingVolumeNumber + nonconnewVolumeNumber;
    const convertedExistingVolume = Math.round(selectedPairs.prefCost * convertedExistingVolumeNumber);
    const convertedNewVolumeNumberToFixed = parseFloat(convertedNewVolumeNumber.toFixed(1));
    const convertedNewVolume = Math.round(selectedPairs.prefCost * convertedNewVolumeNumberToFixed);
    const nonconexistingVolume = Math.round(selectedPairs.nonPrefCost * nonconexistingVolumeNumber);
    const nonconnewVolumeNumberToFixed = parseFloat(nonconnewVolumeNumber.toFixed(1));
    const nonconnewVolume = Math.round(selectedPairs.nonPrefCost * nonconnewVolumeNumberToFixed);
    const next12MosWithConvertion = Math.round(convertedExistingVolume + convertedNewVolume + nonconexistingVolume + nonconnewVolume);
    const savings = Math.round(nonPrefLast12MosCost - next12MosWithConvertion);
    const savingsExistingVolume = Math.round(nonPrefRxVolume * (selectedPairs.percentConExistingVolume / 100) *
      (selectedPairs.nonPrefCost - selectedPairs.prefCost));
    const costAvoidanceNewVolume = Math.round((selectedPairs.nonPrefVolumeIncreaseRx - nonPrefRxVolume) *
      (selectedPairs.nonPrefCost - selectedPairs.prefCost) * (selectedPairs.percentConNewVolume / 100));
    defaultControl.savings.setValue(savings);
    defaultControl.savingsExistingVolume.setValue(savingsExistingVolume);
    defaultControl.costAvoidance.setValue(costAvoidanceNewVolume);
    defaultControl.nonPrefLast12MosCost.setValue(nonPrefLast12MosCost);
    defaultControl.nonPrefNext12MosCostNoConvertion.setValue(nonPrefNext12MosCostNoConvertion);
    defaultControl.next12MosWithConvertion.setValue(next12MosWithConvertion);

    const modelingCalculationDetails = {
      convertedExistingVolumeNumber,
      convertedNewVolumeNumber,
      nonconexistingVolumeNumber,
      nonconnewVolumeNumber,
      totalVolume,
      convertedExistingVolume,
      convertedNewVolume,
      nonconexistingVolume,
      nonconnewVolume,
      next12MosWithConvertion,
      nonPrefProductName: selectedPairs.nonPrefMedHistory.productName,
      prefProductName: selectedPairs.prefMedHistory.productName,
    };
    defaultControl.modelingCalculationDetails.setValue(modelingCalculationDetails);
    this.calculateTotals(regionIndex);
  }

  setEditableNumbers(controlValue: ConvertedData, regionIndex: number, rowNumber: number) {
    const defaultControl = this.viewByForm.get('items')['controls'][regionIndex].get('convertedData')['controls'][rowNumber].controls;
    defaultControl.percentConExistingVolume.setValue(this.validateNumberPercentageHigh(controlValue.percentConExistingVolume));
    defaultControl.percentConNewVolume.setValue(this.validateNumberPercentageHigh(controlValue.percentConNewVolume));
    defaultControl.nonPrefPercentVolumeIncrease.setValue(this.validateNumberPercentageHigh(controlValue.nonPrefPercentVolumeIncrease));
    defaultControl.percentConExistingVolume.setValue(this.validateNumberPercentageLow(controlValue.percentConExistingVolume));
    defaultControl.percentConNewVolume.setValue(this.validateNumberPercentageLow(controlValue.percentConNewVolume));
    defaultControl.nonPrefPercentVolumeIncrease.setValue(this.validateNumberPercentageLow(controlValue.nonPrefPercentVolumeIncrease));
  }

  calculateTotals(regionIndex: number) {
    const formValue = this.viewByForm.get('items')['controls'][regionIndex].value;
    let savings = 0;
    let savingsExistingVolume = 0;
    let costAvoidance = 0;
    let nonPrefLast12MosCost = 0;
    let nonPrefNext12MosCostNoConvertion = 0;
    let next12MosWithConvertion = 0;
    for (const key of Object.keys(formValue.convertedData)) {
      savings += parseFloat(formValue.convertedData[key].savings);
      savingsExistingVolume += parseFloat(formValue.convertedData[key].savingsExistingVolume);
      costAvoidance += parseFloat(formValue.convertedData[key].costAvoidance);
      nonPrefLast12MosCost += parseFloat(formValue.convertedData[key].nonPrefLast12MosCost);
      nonPrefNext12MosCostNoConvertion += parseFloat(formValue.convertedData[key].nonPrefNext12MosCostNoConvertion);
      next12MosWithConvertion += parseFloat(formValue.convertedData[key].next12MosWithConvertion);
    }
    const itemControl = this.viewByForm.get('items')['controls'][regionIndex];
    itemControl.controls.savingsTotal.setValue(Math.round(savings));
    itemControl.controls.costAvoidanceTotal.setValue(Math.round(savingsExistingVolume));
    itemControl.controls.costAvoidanceNewTotal.setValue(Math.round(costAvoidance));

    itemControl.controls.nonPrefLast12MosCostTotal.setValue(Math.round(nonPrefLast12MosCost));
    itemControl.controls.nonPrefNext12MosCostNoConvertionTotal.setValue(Math.round(nonPrefNext12MosCostNoConvertion));
    itemControl.controls.next12MosWithConvertionTotal.setValue(Math.round(next12MosWithConvertion));
    this.passFormData();
  }

  getSavings(isCreateMode: boolean) {
    this.showSpinner = true;
    const bodyCritiarea = this.getCritiarea();
    this.modelingService.getMedHistory(JSON.stringify(bodyCritiarea)).subscribe((res: ModelingInfo) => {
      if (res) {
        this.showSpinner = false;
        this.getMedHistory(res.fromData, res.toData);
        this.getDateRange(res.dateRange);
        this.getFromTherapeutics(res.fromTheraData);
        this.getToTherapeutics(res.toTheraData);
        if (isCreateMode) {
          this.changeMedHistory();
        }
        this.hideShowTableColumns[2] = true;
      }
    });
  }

  getMedHistory(fromData: MedHistory[], toData: MedHistory[]) {
    for (const key of Object.keys(fromData)) {
      fromData[key].costPerRxNr = this.makeToFixed(fromData[key].costPerRxNr);
      fromData[key].totalCost = this.makeToFixed(fromData[key].totalCost);
      fromData[key].costPerDayNr = this.makeToFixed(fromData[key].costPerDayNr);
      fromData[key].qntyPerDayNr = this.makeToFixed(fromData[key].qntyPerDayNr);
    }
    for (const key of Object.keys(toData)) {
      toData[key].costPerRxNr = this.makeToFixed(toData[key].costPerRxNr);
      toData[key].totalCost = this.makeToFixed(toData[key].totalCost);
      toData[key].costPerDayNr = this.makeToFixed(toData[key].costPerDayNr);
      toData[key].qntyPerDayNr = this.makeToFixed(toData[key].qntyPerDayNr);
    }
    this.fromDataConvertion = fromData;
    this.toDataConvertion = toData;
  }

  makeToFixed(value: number) {
    return (value) ? value.toFixed(2) : value;
  }

  getDateRange(dateRange: DateRange[]) {
    if (dateRange && dateRange.length) {
      this.dateRange = dateRange[0];
    }
  }

  getFromTherapeutics(fromTheraData: FromTheraClass[]) {
    if (fromTheraData && fromTheraData.length > 0) {
      let fromThera = '';
      fromTheraData.forEach((val, key) => {
        if (key > 0) {
          fromThera += ' ~ ';
        }
        fromThera += val.fromTherapeuticClass;
      });
      this.fromTheraData = fromThera;
    }
  }

  getToTherapeutics(toTheraData: ToTheraClass[]) {
    if (toTheraData && toTheraData.length > 0) {
      let toThera = '';
      toTheraData.forEach((val, key) => {
        if (key > 0) {
          toThera += ' ~ ';
        }
        toThera += val.toTherapeuticClass;
      });
      this.toTheraData = toThera;
    }
  }

 getCritiarea() {
    const ageCritiarea = this.getAgeCritiarea();
    const regionCritiarea = this.getRegionCritiarea();
    const fromMeds = this.getFromProductCritiarea();
    const toMeds = this.getToProductCritiarea();
    const lob = this.getLobsCritiarea();
    const lookBackPeriods = this.getLookBackCritiarea();
    const body = {
      fromMeds: fromMeds,
      toMeds: toMeds,
      region: regionCritiarea.regionValue,
      patientAgeValue1: ageCritiarea.startAge,
      patientAgeValue2: ageCritiarea.endAge,
      lobs: lob,
      lookBackPeriod: lookBackPeriods
    };
    return body;
  }

  getLobsCritiarea() {
    let lobs = '';
    if (this.userform.value.lobCondition && this.userform.value.lobCondition.length) {
      const lobNames = this.userform.value.lobCondition.map(item => {
        return item.name;
      });
      lobs = lobNames.toString();
    }
    return lobs;
  }

  getLookBackCritiarea() {
    let lookBackPeriod = '';
    if (this.userform.value.lookBackPeriodCondition !== '' && this.userform.value.lookBackPeriodCondition !== null) {
      lookBackPeriod = this.userform.value.lookBackPeriodCondition.id;
    }

    return lookBackPeriod;
  }

  getFromProductCritiarea() {
    let fromIds = [];
    if (this.userform.value.fromDrug.Generic && this.userform.value.fromDrug.Generic.length) {
      this.userform.value.fromDrug.Generic.forEach((val) => {
        if (val.genericMedidList) {
          const ids = val.genericMedidList.split(',');
          fromIds = fromIds.concat(ids);
        }
      });
    }
    if (this.userform.value.fromDrug.Product && this.userform.value.fromDrug.Product.length) {
      this.userform.value.fromDrug.Product.forEach((val) => {
        fromIds.push(val.medId);
      });
    }
    if (this.userform.value.fromDrug.NDC && this.userform.value.fromDrug.NDC.length) {
      this.userform.value.fromDrug.NDC.forEach((val) => {
        val.data.forEach((vals) => {
          vals.data.forEach((value) => {
            value.data.forEach((v) => {
              fromIds.push(v.ndc);
            });
          });
        });
      });
    }

    return fromIds.toString();
  }

  getToProductCritiarea() {
    let toIds = [];
    if (this.userform.value.toDrug.Generic && this.userform.value.toDrug.Generic.length) {
      this.userform.value.toDrug.Generic.forEach((val) => {
        if (val.genericMedidList) {
          const ids = val.genericMedidList.split(',');
          toIds = toIds.concat(ids);
        }
      });
    }
    if (this.userform.value.toDrug.Product && this.userform.value.toDrug.Product.length) {
      this.userform.value.toDrug.Product.forEach((val) => {
        toIds.push(val.medId);
      });
    }
    if (this.userform.value.toDrug.NDC && this.userform.value.toDrug.NDC.length) {
      this.userform.value.toDrug.NDC.forEach((val) => {
        val.data.forEach((vals) => {
          vals.data.forEach((value) => {
            value.data.forEach((v) => {
              toIds.push(v.ndc);
            });
          });
        });
      });
    }
    return toIds.toString();
  }
  getAgeCritiarea() {
    let startAge = '';
    let endAge = '';
    if (this.userform.value.patientAgeCondition) {
      startAge = this.userform.value.patientAgeValue1;
      endAge = this.userform.value.patientAgeValue2;
    }
    if (this.userform.value.patientAgeCondition &&
      this.userform.value.patientAgeCondition.id === 'BETWEEN' &&
      this.userform.value.patientAgeValue2 < this.userform.value.patientAgeValue1) {
      startAge = this.userform.value.patientAgeValue2;
      endAge = this.userform.value.patientAgeValue1;
    }
    if (this.userform.value.patientAgeCondition &&
      this.userform.value.patientAgeCondition.id === 'BETWEEN' &&
      (this.userform.value.patientAgeValue1 === '' || this.userform.value.patientAgeValue2 === '')) {
      startAge = '';
      endAge = '';
    }
    if (this.userform.value.patientAgeCondition &&
      this.userform.value.patientAgeCondition.id === 'UNDER' &&
      this.userform.value.patientAgeValue1 !== '') {
      startAge = '0';
      endAge = this.userform.value.patientAgeValue1;
    }
    if (this.userform.value.patientAgeCondition &&
      this.userform.value.patientAgeCondition.id === 'OVER' &&
      this.userform.value.patientAgeValue1 !== '') {
      startAge = this.userform.value.patientAgeValue1;
      endAge = '200';
    }
    return {
      startAge,
      endAge
    };
  }

  getRegionCritiarea() {
    const regionIds = [];
    let regionValue = '';
    for (const stateKey of Object.keys(this.StatesData)) {
      regionIds.push(this.StatesData[stateKey].id);
    }
    regionValue = regionIds.toString();
    return {
      regionValue,
      regionIds
    };
  }

  changeMedHistory() {
    this.selectedView = this.userform.value.selectedView;
    this.confirmModeling();
  }

  assignModelingDataFromServer() {
    if (this.selectedView) {
      this.nonPreferredData = JSON.parse(JSON.stringify(this.fromDataConvertion));
      this.preferredData = JSON.parse(JSON.stringify(this.toDataConvertion));
    } else {
      this.nonPreferredData = JSON.parse(JSON.stringify(this.fromDataFullConvertion));
      this.preferredData = JSON.parse(JSON.stringify(this.toDataFullConvertion));
    }
    this.userform.controls.dateRange.setValue(this.dateRange);
    this.userform.controls.fromTheraData.setValue(this.fromTheraData);
    this.userform.controls.toTheraData.setValue(this.toTheraData);
  }

  resetModeling() {
    this.viewByForm = this.fb.group({
      items: this.fb.array([]),
    });
  }

  confirmModeling() {
    this.assignModelingDataFromServer();
    this.resetModeling();
    this.setFormModelingData();
  }

  cancelModeling() {
    this.userform.controls.selectedView.setValue(this.selectedView);
  }

  setRegionNonPreferred(regionId: string) {
    const nonPreferredData = [];
    for (const nonPrefKey of Object.keys(this.nonPreferredData)) {
      if (this.nonPreferredData[nonPrefKey].region === regionId) {
        nonPreferredData.push(this.fb.group({
          isChecked: new FormControl(false),
          uniqueId: new FormControl(this.nonPreferredData[nonPrefKey].uniqueId),
          region: new FormControl(this.nonPreferredData[nonPrefKey].region),
          productName: new FormControl(this.nonPreferredData[nonPrefKey].productName),
          medIdCd: new FormControl(this.nonPreferredData[nonPrefKey].medIdCd),
          ndcList: new FormControl(this.nonPreferredData[nonPrefKey].ndcList),
          qntyNr: new FormControl(this.nonPreferredData[nonPrefKey].qntyNr),
          daysNr: new FormControl(this.nonPreferredData[nonPrefKey].daysNr),
          qntyPerDayNr: new FormControl(this.nonPreferredData[nonPrefKey].qntyPerDayNr),
          costPerDayNr: new FormControl(this.nonPreferredData[nonPrefKey].costPerDayNr),
          costPerRxNr: new FormControl(this.nonPreferredData[nonPrefKey].costPerRxNr),
          totalCost: new FormControl(this.nonPreferredData[nonPrefKey].totalCost),
          totalRx: new FormControl(this.nonPreferredData[nonPrefKey].totalRx),
          rank: new FormControl(this.nonPreferredData[nonPrefKey].rank)
        }));
      }
    }
    return nonPreferredData;
  }

  setRegionPreferred(regionId: string) {
    const preferredData = [];
    for (const prefKey of Object.keys(this.preferredData)) {
      if (this.preferredData[prefKey].region === regionId) {
        preferredData.push(this.fb.group({
          uniqueId: new FormControl(this.preferredData[prefKey].uniqueId),
          region: new FormControl(this.preferredData[prefKey].region),
          productName: new FormControl(this.preferredData[prefKey].productName),
          medIdCd: new FormControl(this.preferredData[prefKey].medIdCd),
          ndcList: new FormControl(this.preferredData[prefKey].ndcList),
          qntyNr: new FormControl(this.preferredData[prefKey].qntyNr),
          daysNr: new FormControl(this.preferredData[prefKey].daysNr),
          qntyPerDayNr: new FormControl(this.preferredData[prefKey].qntyPerDayNr),
          costPerDayNr: new FormControl(this.preferredData[prefKey].costPerDayNr),
          costPerRxNr: new FormControl(this.preferredData[prefKey].costPerRxNr),
          totalCost: new FormControl(this.preferredData[prefKey].totalCost),
          totalRx: new FormControl(this.preferredData[prefKey].totalRx),
          rank: new FormControl(this.preferredData[prefKey].rank)
        }));
      }
    }
    return preferredData;
  }

  setFormModelingData() {
    const selectedStateData = this.StatesData;
    for (const stateKey of Object.keys(selectedStateData)) {
      const control = this.viewByForm.get('items') as FormArray;
      const nonPreferredData = this.setRegionNonPreferred(selectedStateData[stateKey].id);
      const preferredData = this.setRegionPreferred(selectedStateData[stateKey].id);
      const fControl = this.fb.group({
        regionCd: new FormControl(selectedStateData[stateKey].id),
        regionDe: new FormControl(selectedStateData[stateKey].name),
        savingsTotal: new FormControl(0),
        costAvoidanceTotal: new FormControl(0),
        costAvoidanceNewTotal: new FormControl(0),
        nonPreferredData: this.fb.array(nonPreferredData),
        preferredData: this.fb.array(preferredData),
        convertedData: this.fb.array([]),
        nonPrefLast12MosCostTotal: new FormControl(0),
        nonPrefNext12MosCostNoConvertionTotal: new FormControl(0),
        next12MosWithConvertionTotal: new FormControl(0),
      });
      control.push(fControl);
    }
  }

  generateModeling() {
    if (!this.isCalculate) {
      this.isLoadedRegions = true;
      this.onConfirm();
    }
    this.setCalculate.emit({
      isCalculate: true
    });
  }

  onConfirm() {
    if (this.userform.value.regionsSelected) {
      this.viewByForm.reset();
      this.getSavings(true);
    }
    this.isCalculate = true;
  }

  toFixed(values: string) {
    if (values) {
      return parseFloat(values).toFixed(2);
    } else {
      return null;
    }
  }
  toFixedQnty(values: number) {
    if (values) {
      return values.toFixed(1);
    } else {
      return null;
    }
  }

  validateNumberPercentageHigh(num: number) {
    if (num > 100) {
      return 100;
    }
    return num;
  }

  validateNumberPercentageLow(num: number) {
    if (num < 0) {
      return 0;
    }
    return num;
  }

  passFormData() {
    this.setCalculationData.emit({
      formValue: this.viewByForm.value.items
    });
  }

}
