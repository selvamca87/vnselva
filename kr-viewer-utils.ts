import { TranslateService } from '@ngx-translate/core';
import * as d3 from 'd3';
import { json } from 'd3';
import * as _ from 'lodash';
import { cloneDeep, omit, uniq, uniqBy, zip } from 'lodash';
import Grid, { Item } from 'muuri';
import { StateContext } from 'ngx-state-store';
import { TreeNode } from 'primeng/api';
import {
  ACTION,
  CB2_TYPE_ACTION,
  ClassificationResult,
  CurveContentRequest,
  DEFAULT_SECTION,
  DefaultLocalVerificationSettings,
  Group,
  GROUPED_TEMPLATE,
  KR_QUERY_TYPE,
  KrODSSettingColors,
  KrSettingColors,
  LOCAL_STORAGE_PARAM,
  LocalVerificationSettings,
  MediaActionUrlData,
  PreviewActionType,
  QueryRequest,
  QueryResponse,
  QueryResult,
  ResultGroup,
  RETURN_TYPE,
  Row,
  SEARCH_RESULT_TYPES,
  Template,
  TemplateConfig,
  TemplateGridConfig,
  VideoFormat,
} from 'src/app/models';
import {
  AddKeyResult,
  GridItemData,
  GridItemLabel,
  GridItemQueryResult,
  KeyGridConfig,
  KEYRESULT_TYPE,
  KR_GRID_PARAMS,
  KrGridOptions,
  TableRowDefinition,
  VALUE_ITEM,
  ValueItemData,
} from 'src/app/models/keyresult.grid.model';
import { KrGridMacros } from 'src/app/models/keyresult.macros.model';
import {
  KR_VIEWER_MENU_CONTROL_TYPE,
  KrViewerMenu,
  KrViewerMenuControl,
  KrViewerMenuControlEvent,
} from 'src/app/models/keyresult.menu.model';
import * as uuid from 'uuid';
import { v4 } from 'uuid';

import { VdcnState } from '../state-store';

import { MirrorUtils } from './mirror.utils';
import { TreeUtils } from './tree.utils';

export class KrviewerUtils {
  static index: number;
  static responseDataFiltered: TemplateGroup[];
  static filterType: string[] = [];
  static filtersString: KrViewerMenuControl[] = [];
  static keyResultType: any;
  static limitStyles = [
    { background: '#33a02c!important', color: 'white!important' },
    { background: 'yellow!important' },
    { background: '#e54e4e!important', color: 'white!important' },
    { background: '#46014e!important', color: 'white!important' },
  ];

  static ordinalColorScale = d3.scaleOrdinal().range(d3.schemeTableau10);

  static gridInfo: TemplateGridConfig;
  static additionalInformation: ClassificationResult[];

  public static createGrid(selectedTemplate: GROUPED_TEMPLATE[]): TemplateGroup[] {
    if (!selectedTemplate?.length) {
      return [];
    }

    let defaultSection: TemplateConfig = { ...DEFAULT_SECTION, gridConfig: [], id: v4() };
    let cleanConfig: TemplateConfig[] = [];

    selectedTemplate.forEach((groupTemplate: GROUPED_TEMPLATE) => {
      groupTemplate.groupItem.forEach((configItem: TemplateConfig) => {
        if (this.isGridItem(configItem)) {
          defaultSection.gridConfig?.push(configItem as TemplateGridConfig);
        } else {
          cleanConfig.push(configItem);
        }
      });
    });

    if (defaultSection.gridConfig?.length) {
      return [
        {
          isGroup: false,
          sections: [defaultSection],
        },
      ];
    }

    if (cleanConfig.length) {
      return Object.values(
        cleanConfig.reduce((acc, curr) => {
          const group = curr.group;
          const section = curr.section;
          // @ts-ignore
          if (!!group && !acc[group]) {
            // @ts-ignore
            acc[group] = {
              group,
              isGroup: !!group,
              sections: [],
              id: !!curr.id ? curr.id : v4(),
              showSection: true,
              expanded: true,
              editable: false,
            };
          }
          if (!group && !!section) {
            // @ts-ignore
            acc[section] = {
              isGroup: !!group,
              sections: [curr],
              id: !!curr.id ? curr.id : v4(),
              showSection: false,
              editable: false,
            };
          }
          // @ts-ignore
          if (!!group) {
            const newSection: TemplateConfig = { ...curr };
            // @ts-ignore
            acc[group].sections.push(newSection);
          }
          return acc;
        }, [])
      );
    }

    return [];
  }

  public static isGridItem(configItem: TemplateConfig): boolean {
    return !configItem?.gridConfig;
  }

  public static isGroup(configItem: TemplateConfig): boolean {
    return !!configItem?.group;
  }

  public static isSection(configItem: TemplateConfig): boolean {
    return !!(!this.isGridItem(configItem) && !this.isGroup(configItem) && configItem.section);
  }

  public static removeItemFromSection(sectionItems: TemplateGridConfig[], item: TemplateGridConfig, index: number): TemplateGridConfig[] {
    const items = [...sectionItems];
    if (!items?.length) {
      return [];
    }

    if (!item) {
      return items;
    }

    return [...items.slice(0, index), ...items.slice(index + 1)].filter(Boolean);
  }

  public static findSectionById(data: TemplateGroup[], sectionId: string): TemplateConfig | null {
    let foundSection: TemplateConfig | null = null;
    const newData = [...data];

    newData.forEach((group: TemplateGroup) => {
      group.sections.forEach((section: TemplateConfig) => {
        if (section.id === sectionId) {
          foundSection = { ...section };
        }
      });
    });

    return foundSection;
  }

  public static findSection(data: TemplateGroup[] | undefined): TemplateConfig[] {
    let foundSection: TemplateConfig[] = [];
    const newData = [...data!];
    newData.forEach((group: TemplateGroup) => {
      group.sections.forEach((section: TemplateConfig) => {
        return foundSection.push(section);
      });
    });
    return foundSection;
  }

  public static findSectionItems(data: TemplateGroup[]): TemplateGridConfig[] {
    let foundConfig: TemplateGridConfig[] = [];
    const newData = [...data];
    newData.forEach((group: TemplateGroup) => {
      group.sections.forEach((section: TemplateConfig) => {
        section.gridConfig?.forEach((config: TemplateGridConfig) => {
          return foundConfig.push(config);
        });
      });
    });

    return foundConfig;
  }

  // kr viewer working area filters
  public static filterItemFromSection(
    data: TemplateGroup[] | undefined,
    section: TemplateConfig[],
    filterEvent: KrViewerMenuControlEvent,
    updateMenuItems: KrViewerMenu | undefined
  ): TemplateGroup[] | undefined {
    if (filterEvent.controlType !== KR_VIEWER_MENU_CONTROL_TYPE.FILTER_CHECK_ALL) {
      this.findOtherFilterTerms(updateMenuItems);
    }
    const items = [...section];
    if (!items?.length) {
      return [];
    }
    return data?.map((group) => ({
      ...group,
      sections: group.sections.map((section) => ({
        ...section,
        gridConfig: this.applyFilterTerm(section.gridConfig, filterEvent, this.filterType, updateMenuItems),
        //section.gridConfig?.filter((gridConfig) => gridConfig.keyResultType === filterType),
      })),
    }));
  }

  // making visible based on filter
  public static applyFilterTerm(
    item: TemplateGridConfig[] | undefined,
    filterEvent: KrViewerMenuControlEvent,
    filterType: string[],
    updateMenuItems: any
  ): TemplateGridConfig[] | undefined {
    if (item) {
      item = Object.assign([], item);
      item = item?.map((n) => {
        n = Object.assign({}, n);
        if (filterEvent.controlType === KR_VIEWER_MENU_CONTROL_TYPE.FILTER_CHECK_ALL) {
          n.visible = updateMenuItems.controls[7].value === true;
        } else {
          n.visible = this.isGridConfigVisible(n, filterType);
        }
        return n;
      });
    }
    return item;
  }

  // push/remove all other filter term
  public static findOtherFilterTerms(updateMenuItems: any): void {
    this.filtersString = updateMenuItems.controls.filter((x: any) => x.value === true);
    this.filterType = [];
    if (this.filtersString != undefined) {
      this.filtersString.forEach((element: KrViewerMenuControl) => {
        var ret = element.controlType.replace('FILTER_', '');
        this.filterType.push(ret.toLocaleLowerCase());
      });
    }
  }

  // filter
  public static isGridConfigVisible(n: TemplateGridConfig, filterType: string[]): boolean {
    return filterType.includes(n.keyResultType);
  }

  public static updateSectionItems(
    data: TemplateGroup[],
    section: TemplateConfig,
    items: TemplateGridConfig[] = [],
    stateContext: StateContext<VdcnState>
  ): TemplateGroup[] {
    return [...data].map((group: TemplateGroup) => {
      // let selectedTemplate = StateHelper.cloneObject(stateContext?.getState().SelectedTemplate);
      if (!!section) {
        const modSection = { ...section, gridConfig: [...items].map((i) => ({ ...i, parentId: section.id! })) };
        const index = group.sections.findIndex((i) => i.id === section.id);

        // selectedTemplate.config[index] = modSection;
        if (index < 0) {
          return group;
        }
        return {
          ...group,
          sections: [...group.sections.slice(0, index), modSection, ...group.sections.slice(index + 1)],
        };
      }

      return group;
    });
  }

  public static updateSectionData(
    data: TemplateGroup[],
    section: TemplateConfig,
    items: TemplateGridConfig[] = [],
    selectedTemplateData: Template | null | undefined
  ): TemplateGroup[] {
    return [...data].map((group: TemplateGroup) => {
      let selectedTemplate = selectedTemplateData;
      if (!!section) {
        const modSection = { ...section, gridConfig: [...items].map((i) => ({ ...i, parentId: section.id! })) };
        const index = group.sections.findIndex((i) => i.id === section.id);

        // selectedTemplate!.config[index] = modSection;
        if (index < 0) {
          return group;
        }
        return {
          ...group,
          sections: [...group.sections.slice(0, index), modSection, ...group.sections.slice(index + 1)],
        };
      }

      return group;
    });
  }

  public static updateSortIndex(data: TemplateGroup[]): TemplateGroup[] {
    return [...data].map((group: TemplateGroup) => {
      const sections = group.sections.map((s) => {
        const gridConfig = s.gridConfig?.map((i, index) => ({ ...i, sortIndex: index }));
        return {
          ...s,
          gridConfig,
        };
      });
      return {
        ...group,
        sections,
      };
    });
  }

  public static findParentOfItem(data: TemplateGroup[], item: TemplateGridConfig): TemplateGroup | null {
    let foundSection: TemplateConfig | null = null;
    data.forEach((g) => {
      g.sections.forEach((s) => {
        s.gridConfig?.forEach((i) => {
          if (i.id === item.id) {
            foundSection = s;
          }
        });
      });
    });

    return foundSection;
  }

  public static getQueryParameter(
    gridConfig: TemplateGridConfig | null | undefined,
    selectedOids: QueryResult[],
    resultGroup: ResultGroup | null = null,
    searchResultType?: string
  ): any[] {
    let cb2type = CB2_TYPE_ACTION.RESULT;
    let expr: string;
    let oids: string[] = [];
    let keyResultTypeReg = /keyResults:(\w+)\[/;
    let mirrorStates = [true, false];

    selectedOids.forEach((x: QueryResult) => {
      oids.push(x.oid.split(':')[0]);
    });
    // find HIC
    let keyResultTypeMap: any = {
      value: {
        HIC: { keyResultType: 'valueHIC' },
      },
    };
    const keyResultGroupString = gridConfig?.keyResultGroup ? ` AND group.name=='${gridConfig.keyResultGroup}'` : '';

    let keys: any[] = [];
    let negate_keys: any[] = [];

    if (typeof gridConfig?.key === 'string' || gridConfig?.key instanceof String) {
      keys.push(gridConfig.key);
    } else {
      keys = Object.keys(gridConfig?.key).filter((key: string) => !gridConfig?.key[key] || gridConfig?.key[key].negate !== true);
      negate_keys = Object.keys(gridConfig?.key).filter((key: string) => gridConfig?.key[key] && gridConfig?.key[key].negate === true);
    }
    if (!keys.length && !negate_keys.length) {
      throw `There are no keys given in the item. Please remove this entry: ${JSON.stringify(gridConfig)}`;
    }

    const exprs = mirrorStates
      .flatMap((mirrorState) => {
        if (mirrorState && !this.mirrorAnyVerification(selectedOids)) {
          return;
        }

        let oid_string = this.buildOidStringMirror(gridConfig, mirrorState, selectedOids, resultGroup, searchResultType);

        let cleanedKeys: any[] = cloneDeep(keys);
        let cleanedNegateKeys: any[] = cloneDeep(negate_keys);
        let currentExprs: any[] = [];

        if (mirrorState) {
          cleanedKeys = cleanedKeys.map((key: string) => MirrorUtils.mirrorFormula(key, gridConfig!.keyResultType)[0]);
          cleanedNegateKeys = cleanedNegateKeys.map((key: string) => MirrorUtils.mirrorFormula(key, gridConfig!.keyResultType)[0]);
        }

        if ((!cleanedKeys.length && !cleanedNegateKeys.length) || !oid_string) {
          return;
        }

        if (mirrorState && JSON.stringify(cleanedKeys).includes('*')) {
          console.log('Using the *-wildcard when mirroring results is not garantued to work. Please use ?-wildcards instead.');
          // this.warnings.push('Using the *-wildcard when mirroring results is not garantued to work. Please use ?-wildcards instead.');
        }

        let processedKeys: any[] = [];
        let keyResultTypeList: any[] = [];
        let filteredKeys;

        if (keyResultTypeMap[gridConfig!.keyResultType]) {
          //filter saperate hic keyresult
          Object.keys(keyResultTypeMap[gridConfig!.keyResultType]).forEach((keyResultTypeMapKey) => {
            filteredKeys = cleanedKeys.filter((cleanedKey) => cleanedKey.includes(keyResultTypeMapKey));
            processedKeys = [...processedKeys, ...filteredKeys];
            keyResultTypeList.push([keyResultTypeMap[gridConfig!.keyResultType][keyResultTypeMapKey].keyResultType, filteredKeys]);
          });
        }

        if (gridConfig!.keyResultType && gridConfig!.keyResultType.includes('value')) {
          filteredKeys = keys
            .map((key) => {
              let includesPointInTime =
                gridConfig?.key[key] && gridConfig.key[key].output && gridConfig.key[key].output.toLowerCase().includes('pointintime');
              if (!includesPointInTime && gridConfig?.formulas) {
                gridConfig!.formulas.forEach((formula: any) => {
                  if (formula.output && formula.output.toLowerCase().includes('pointintime') && JSON.stringify(formula).includes(key)) {
                    includesPointInTime = true;
                  }
                });
              }
              if (includesPointInTime) {
                return mirrorState ? MirrorUtils.mirrorFormula(key, gridConfig!.keyResultType)[0] : key;
              }
            })
            .filter((key) => key != null);
          processedKeys = [...processedKeys, ...filteredKeys];
          keyResultTypeList.push(['timedValue', filteredKeys]);
        }

        keyResultTypeList.push([gridConfig!.keyResultType, cleanedKeys.filter((cleanedKey) => !processedKeys.includes(cleanedKey))]);

        keyResultTypeList.forEach(([keyResultType, cleanedKeys]) => {
          if (!cleanedKeys.length && !cleanedNegateKeys.length) {
            return;
          }
          let name_part = '';
          let name_negate_part = '';

          if (!!cleanedKeys.length) {
            name_part = `name==['${cleanedKeys.join("','")}']`;
          }
          if (!!cleanedNegateKeys.length) {
            name_negate_part = `name!=['${cleanedNegateKeys.join("','")}']`;
          }

          let name_string: string;

          if (name_part !== '' && name_negate_part !== '') {
            name_string = `[${name_part} AND ${name_negate_part}${keyResultGroupString}]`;
          } else {
            name_string = `[${name_part}${name_negate_part}${keyResultGroupString}]`;
          }

          let expr: string;

          if (keyResultType === 'value+document') {
            ['value', 'document'].forEach((_keyResultType) => {
              expr = oid_string + '.keyResults:KeyResult' + this.capitalizeFirstLetter(_keyResultType) + name_string;
              currentExprs.push(expr.split("[name==['*']]").join('').split("[name=='*']").join('').split("name==['*'] AND ").join(''));
            });
          } else {
            if (keyResultType === 'metadata') {
              expr = oid_string as string;
            } else if (['picture', 'image'].includes(keyResultType)) {
              expr =
                oid_string +
                '.keyResults' +
                name_string.replace(
                  '[',
                  "[type.name==['KeyResultPicture','KeyResultTimedPicture','KeyResultImage','KeyResultCrossSection'] AND "
                );
            } else {
              expr = oid_string + '.keyResults:KeyResult' + this.capitalizeFirstLetter(keyResultType) + name_string;
            }
            currentExprs.push(expr.split("[name==['*']]").join('').split("[name=='*']").join('').split("name==['*'] AND ").join(''));
          }
        });

        return currentExprs;
      })
      .filter((expr) => expr != null);

    const uniqueKeyResultTypes = uniq(
      exprs.map((expr) => expr.match(keyResultTypeReg) && expr.match(keyResultTypeReg)[1]).filter((entry) => entry != null)
    );

    if (!exprs.length) {
      throw `No expression could be created for config: ${JSON.stringify(gridConfig?.key)}`;
    }

    if (exprs.length == 1) {
      return [cb2type, exprs[0]];
    }

    if (uniqueKeyResultTypes.length > 1) {
      return [cb2type, exprs];
    }

    return [cb2type, `union(${exprs.join(',')})`];
  }

  public static buildOidString(gridConfig: TemplateGridConfig | null | undefined, oids: string[]): string {
    let filterExpr = '';
    if (gridConfig?.filterExpr) filterExpr = `.[${gridConfig.filterExpr}]`;
    return `[objectId==['${oids.join("','")}']]${filterExpr}`;
  }

  public static buildOidStringMirror(
    gridConfig: TemplateGridConfig | null | undefined,
    mirror: any,
    oids: QueryResult[] = [],
    resultGroups: ResultGroup | null = null,
    searchResultType?: string
  ): string | null {
    let filterExpr = '';
    let wantedOids: string[] = this.getSortedVisibleSelections(resultGroups, oids).filter((selection) =>
      mirror != null ? this.mirrorVerification(selection) === mirror : true
    );
    if (gridConfig?.filterExpr) {
      filterExpr = `.[${gridConfig.filterExpr}]`;
    }
    // return `[objectId==['${oids.join("','")}']]${filterExpr}`;
    if (searchResultType === SEARCH_RESULT_TYPES.ODS) {
      return !!wantedOids.length
        ? '[' +
            wantedOids
              .sort()
              .map((selection: string) => `'${selection!.split(':')[0]}'`)
              .join(';') +
            `]${filterExpr}`
        : null;
    } else {
      return !!wantedOids.length
        ? '[objectId==[' +
            wantedOids
              .sort()
              .map((selection: string) => `'${selection!.split(':')[0]}'`)
              .join(',') +
            `]]${filterExpr}`
        : null;
    }
  }

  public static capitalizeFirstLetter(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  public static toRequestParam(
    item: TemplateGridConfig | null | undefined,
    selectedResults: QueryResult[],
    withViewRequest: boolean,
    resultGroup: ResultGroup | null = null,
    searchResultType?: string
  ): QueryRequest {
    const [queryType, expr] = KrviewerUtils.getQueryParameter(item, selectedResults, resultGroup, searchResultType);
    let queryRequest: QueryRequest;
    if (withViewRequest) {
      queryRequest = {
        attachVdcComments: true,
        type: queryType as CB2_TYPE_ACTION,
        expr: expr,
        return_type: RETURN_TYPE.ITEMS,
        ...{
          views: this.getQueryViews(item),
        },
      };
    } else {
      queryRequest = {
        //attachVdcComments: true,
        type: queryType as CB2_TYPE_ACTION,
        expr: expr,
        return_type: RETURN_TYPE.ITEMS,
      };
    }

    if (searchResultType === SEARCH_RESULT_TYPES.ODS) {
      queryRequest = {
        ...queryRequest,
        action: ACTION.QUERY,
        ...{
          views: this.getQueryViewsODS(item),
        },
      };
    }

    return queryRequest;
  }

  public static getQueryViews(gridConfig: TemplateGridConfig | null | undefined): any {
    let views: string[] | any;
    if (gridConfig?.keyResultType === KrGridOptions.METADATA) {
      if (typeof gridConfig.key === 'string') {
        views = [gridConfig.key];
      } else {
        views = Object.keys(gridConfig.key);
      }
    } else if (gridConfig?.keyResultType === KrGridOptions.DOCUMENT) {
      views = ['name', 'label', 'result', 'content'];
    } else if (gridConfig?.keyResultType === KrGridOptions.VALUE) {
      let keys = Object.keys(gridConfig.key);
      let includesPointInTime: boolean = false;
      keys.map((key) => {
        includesPointInTime =
          gridConfig.key[key] && gridConfig.key[key].output && gridConfig.key[key].output.toLowerCase().includes('pointintime');
        if (!includesPointInTime && gridConfig.formulas) {
          gridConfig.formulas.forEach((formula: any) => {
            if (formula.output && formula.output.toLowerCase().includes('pointintime') && JSON.stringify(formula).includes(key))
              includesPointInTime = true;
          });
        }
        return includesPointInTime;
      });

      if (includesPointInTime) {
        views = ['name', 'label', 'result', 'value', 'pointintime'];
      } else {
        views = ['name', 'label', 'result', 'value'];
      }
    } else if (gridConfig?.keyResultType === KrGridOptions.MOVIE) {
      views = [
        'name',
        'label',
        'result',
        "properties:DoubleProperty[name=='starttime'].value",
        "properties:DoubleProperty[name=='endtime'].value",
      ];
    } else if (gridConfig?.keyResultType === KrGridOptions.VALUE_DOCUMENT) {
      views = [
        ['name', 'label', 'result', 'value'],
        ['name', 'label', 'result', 'content'],
      ];
    } else {
      views = ['name', 'label', 'result'];
    }

    return views;
  }

  public static getQueryViewsODS(gridConfig: TemplateGridConfig | null | undefined): any {
    let views: string[] | any;
    if (gridConfig?.keyResultType === KrGridOptions.METADATA) {
      if (typeof gridConfig.key === 'string') {
        views = [gridConfig.key];
      } else {
        views = Object.keys(gridConfig.key);
      }
    } else if (gridConfig?.keyResultType === KrGridOptions.DOCUMENT) {
      views = ['name', 'label', 'result'];
    } else if (gridConfig?.keyResultType === KrGridOptions.VALUE) {
      let keys = Object.keys(gridConfig.key);
      let includesPointInTime: boolean = false;
      keys.map((key) => {
        includesPointInTime =
          gridConfig.key[key] && gridConfig.key[key].output && gridConfig.key[key].output.toLowerCase().includes('pointintime');
        if (!includesPointInTime && gridConfig.formulas) {
          gridConfig.formulas.forEach((formula: any) => {
            if (formula.output && formula.output.toLowerCase().includes('pointintime') && JSON.stringify(formula).includes(key))
              includesPointInTime = true;
          });
        }
        return includesPointInTime;
      });

      if (includesPointInTime) {
        views = ['name', 'label', 'result', 'value', 'pointintime'];
      } else {
        views = ['name', 'label', 'result', 'value'];
      }
    } else if (gridConfig?.keyResultType === KrGridOptions.MOVIE) {
      views = [
        'name',
        'label',
        'result',
        "properties:DoubleProperty[name=='starttime'].value",
        "properties:DoubleProperty[name=='endtime'].value",
      ];
    } else if (gridConfig?.keyResultType === KrGridOptions.VALUE_DOCUMENT) {
      views = [
        ['name', 'label', 'result', 'value'],
        ['name', 'label', 'result', 'content'],
      ];
    } else {
      views = ['name', 'label', 'result'];
    }

    return views;
  }

  public static toCurveData(item: GridItemQueryResult): CurveContentRequest {
    let path = '/Car/Data/' + item.result.text + '/' + item.type + '/' + item.name;
    return {
      oid: item.oid ? item.oid : item.name,
      item: path,
    } as CurveContentRequest;
  }

  public static propertiesToArray(currentObject: any, valueMap: any, additionalKeysToSkip: any): any {
    let keysToSkip = KR_GRID_PARAMS.keysToSkip;
    if (Array.isArray(additionalKeysToSkip)) keysToSkip = _.uniq([...keysToSkip, ...additionalKeysToSkip]);

    const isObject: any = (val: unknown) => val && typeof val === KR_GRID_PARAMS.object && !Array.isArray(val) && val != null;
    const addDelimiter: any = (a: string, b: string) => (a ? `${a}.${b}` : b);

    const paths: any = (obj = {}, head = '') => {
      return Object.entries(obj).flatMap(([key, value]) => {
        if (keysToSkip.includes(key)) return [];
        let fullPath = addDelimiter(head, head === KR_GRID_PARAMS.key ? KR_GRID_PARAMS.keyPhrase : key);
        if (key === KR_GRID_PARAMS.key && typeof value === 'string') return paths({ key: null }, fullPath);

        if (['sortIndex'].includes(key)) valueMap[fullPath] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        else if (['height', 'width'].includes(key)) valueMap[fullPath] = [1, 2, 3, 4, 5, 6];
        else if (['title', 'label', 'x_label', 'y_label'].includes(key)) valueMap[fullPath] = 'Free text';
        else if (!isObject(value)) {
          if (valueMap[fullPath]) valueMap[fullPath].push(value);
          else valueMap[fullPath] = [value];
        }
        return isObject(value) ? paths(value, fullPath) : [fullPath];
      });
    };

    return _.uniq(paths(currentObject));
  }

  public static objectFromList(listOfEntries: any, valueMap: any): object {
    let newObject: any = {};
    let nestedValue: any;
    if (Object.keys(valueMap).length > 0) {
      this.keyResultType = valueMap['keyResultType'][0];
    }
    const skipData = ['movie', 'image', 'picture'].includes(this.keyResultType!);
    listOfEntries.forEach((entry: any) => {
      const value = valueMap[entry]
        ? Array.isArray(valueMap[entry])
          ? uniq(valueMap[entry]).sort()
          : valueMap[entry]
        : KR_GRID_PARAMS.unknown;
      if (entry.split('.').length === 1) newObject[entry] = value;
      else {
        let nestedObject = newObject;
        let entries = entry.split('.');
        entries.forEach((nestedEntry: string | number) => {
          // const nestedValue = entries.slice(-1)[0] === nestedEntry ? value : {};
          if (entries.slice(-1)[0] === nestedEntry) {
            if (value[0] !== null || skipData) {
              nestedValue = value;
              nestedObject[nestedEntry] = nestedObject[nestedEntry] ? nestedObject[nestedEntry] : nestedValue;
              nestedObject = nestedObject[nestedEntry];
            }
          } else {
            nestedValue = {};
            nestedObject[nestedEntry] = nestedObject[nestedEntry] ? nestedObject[nestedEntry] : nestedValue;
            nestedObject = nestedObject[nestedEntry];
          }
        });
      }
    });
    return newObject;
  }

  public static prettyPrintArray(obj: any): string {
    return JSON.stringify(obj, (key, val) => (val instanceof Array ? JSON.stringify(val) : val), 4)
      .replace(/\\/g, '')
      .replace(/\[/g, '[')
      .replace(/\]/g, ']')
      .replace(/\{/g, '{')
      .replace(/\}/g, '}');
  }

  public static generateQueryRequestFromSelections(selections: any, addKeyResults: AddKeyResult | any, index: number): QueryRequest {
    let expr: string = '',
      oid_string: string;
    oid_string = KR_GRID_PARAMS.objectIdString + selections[index].oid.split(':')[0] + "']";
    expr = oid_string + KR_GRID_PARAMS.keyresultString + this.capitalizeFirstLetter(addKeyResults.selected ? addKeyResults.selected : '');
    if (addKeyResults.selected === KrGridOptions.PICTURE || addKeyResults.selected === KrGridOptions.IMAGE) {
      expr = expr = oid_string + KR_GRID_PARAMS.keyresultExprString;
    } else {
      expr = oid_string + KR_GRID_PARAMS.keyresultString + this.capitalizeFirstLetter(addKeyResults.selected ? addKeyResults.selected : '');
    }
    const queryRequest: QueryRequest = {
      action: ACTION.QUERY,
      type: KR_QUERY_TYPE.RESULT,
      expr: expr,
      return_type: RETURN_TYPE.LIST,
      limit: KR_GRID_PARAMS.limit,
      offset: KR_GRID_PARAMS.offset,
      search: KR_GRID_PARAMS.search,
      views: KR_GRID_PARAMS.views,
    };
    return queryRequest;
  }

  public static isCurveItem(item: TemplateGridConfig | null | undefined): boolean {
    return item?.keyResultType === KEYRESULT_TYPE.CURVE;
  }

  public static isValue3DTableItem(item: TemplateGridConfig | null | undefined): boolean {
    return item?.keyResultType === KEYRESULT_TYPE.VALUE3D && item?.type === KEYRESULT_TYPE.TABLE;
  }

  public static isValueTableItem(item: TemplateGridConfig | null | undefined): boolean {
    //@ts-ignore
    return VALUE_ITEM.includes(item?.keyResultType) && item?.type === KEYRESULT_TYPE.TABLE;
  }

  public static isValueItem(item: TemplateGridConfig | null | undefined): boolean {
    //@ts-ignore
    return VALUE_ITEM.includes(item?.keyResultType) && item?.type !== KEYRESULT_TYPE.TABLE;
  }

  public static isValue3DItem(item: TemplateGridConfig | null | undefined): boolean {
    return item?.keyResultType === KEYRESULT_TYPE.VALUE3D && item?.type !== KEYRESULT_TYPE.TABLE;
  }

  public static isVideoItem(item: TemplateGridConfig | null | undefined): boolean {
    return item?.keyResultType === KEYRESULT_TYPE.MOVIE;
  }

  public static isTextItem(item: TemplateGridConfig | null | undefined): boolean {
    return item?.keyResultType === KEYRESULT_TYPE.TEXT;
  }

  public static isImageSingleItem(item: TemplateGridConfig | null | undefined): boolean {
    //@ts-ignore
    return [KEYRESULT_TYPE.PICTURE, KEYRESULT_TYPE.IMAGE].includes(item?.keyResultType) && item?.type === KEYRESULT_TYPE.SINGLE;
  }

  public static isImageCarouselItem(item: TemplateGridConfig | null | undefined): boolean {
    //@ts-ignore
    return [KEYRESULT_TYPE.PICTURE, KEYRESULT_TYPE.IMAGE].includes(item?.keyResultType) && item?.type === KEYRESULT_TYPE.CAROUSEL;
  }

  public static isImageStaticItem(item: TemplateGridConfig | null | undefined): boolean {
    //@ts-ignore
    return [KEYRESULT_TYPE.PICTURE, KEYRESULT_TYPE.IMAGE].includes(item?.keyResultType) && item?.type === KEYRESULT_TYPE.STATIC;
  }

  public static applyGlobalSettings(tempGlobalSettings: any, globalSettings: any): void {
    if (tempGlobalSettings.resultDisplayQuery == '') return;
    const resultDisplayQueryChanged = globalSettings.resultDisplayQuery !== tempGlobalSettings.resultDisplayQuery;
    globalSettings = _.cloneDeep(globalSettings);
    localStorage.setItem('globalSettings', JSON.stringify(globalSettings));
  }

  public static getGlobalSettings(): void {
    return JSON.parse(localStorage.getItem('globalSettings')!);
  }

  public static getLocalVerficationSettings(): void {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_PARAM.VERIFICATIONSETTINGS)!);
  }

  public static updateResultsinLocal(krViewerGridItems: QueryResult[]): void {
    let localStorageResults = localStorage.getItem(LOCAL_STORAGE_PARAM.VERIFICATIONSETTINGS);
    let localVerificationSettings: any = DefaultLocalVerificationSettings;
    if (localStorageResults) {
      localVerificationSettings = JSON.parse(localStorageResults);
    }

    krViewerGridItems.forEach((item, index) => {
      if (!item) {
        return;
      }
      if (!(item.oid in localVerificationSettings)) {
        let globalSettings = this.getGlobalSettings();

        const displayName =
          //@ts-ignore
          item.attrs[globalSettings?.resultDisplayQuery] &&
          //@ts-ignore
          item.attrs[globalSettings?.resultDisplayQuery].text
            ? //@ts-ignore
              item.attrs[globalSettings?.resultDisplayQuery].text
            : item.attrs.name.text;
        //@ts-ignore
        localVerificationSettings[item.oid] = {
          color: item.color,
          name: item.name,
          displayName: displayName,
          loadCaseCode: item.loadCaseCode,
          keyResultSettings: item.keyResultSettings,
          type: item.type,
          mirroredOid: undefined,
          mirror: item.mirror,
        };
      }
      if (item.oid in localVerificationSettings) {
        let globalSettings = this.getGlobalSettings();

        const displayName =
          //@ts-ignore
          item.attrs[globalSettings?.resultDisplayQuery] &&
          //@ts-ignore
          item.attrs[globalSettings?.resultDisplayQuery].text
            ? //@ts-ignore
              item.attrs[globalSettings?.resultDisplayQuery].text
            : item.attrs.name.text;

        //@ts-ignore
        localVerificationSettings[item.oid] = {
          color: krViewerGridItems[index].color,
          name: item.name,
          displayName: displayName,
          loadCaseCode: item.loadCaseCode,
          keyResultSettings: item.keyResultSettings,
          type: item.type,
          mirroredOid: undefined,
          mirror: item.mirror,
        };
      }
    });

    if (krViewerGridItems && krViewerGridItems.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_PARAM.VERIFICATIONSETTINGS, JSON.stringify(localVerificationSettings));
    }
  }

  public static mapLocalResultsValues(krViewerGridItems: QueryResult[]): QueryResult[] {
    let localStorageResults = localStorage.getItem(LOCAL_STORAGE_PARAM.VERIFICATIONSETTINGS);
    if (!localStorageResults) {
      localStorage.setItem(LOCAL_STORAGE_PARAM.VERIFICATIONSETTINGS, JSON.stringify(DefaultLocalVerificationSettings));
      localStorageResults = localStorage.getItem(LOCAL_STORAGE_PARAM.VERIFICATIONSETTINGS);
    }
    if (localStorageResults) {
      let localVerificationSettings = JSON.parse(localStorageResults);
      krViewerGridItems.map((item, index) => {
        if (item.oid in localVerificationSettings) {
          krViewerGridItems[index].color = localVerificationSettings[item.oid].color;
          krViewerGridItems[index].keyResultSettings = localVerificationSettings[item.oid].keyResultSettings;
          krViewerGridItems[index].mirror = localVerificationSettings[item.oid].mirror;
        } else {
          localVerificationSettings[item.oid] = {
            color: this.getColor(krViewerGridItems, index),
            name: item.name,
            displayName: item.name,
            loadCaseCode: item.loadCaseCode,
            keyResultSettings: item.keyResultSettings,
            type: item.type,
            mirroredOid: undefined,
            mirror: item.mirror,
          };
        }
      });
      if (krViewerGridItems && krViewerGridItems.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_PARAM.VERIFICATIONSETTINGS, JSON.stringify(localVerificationSettings));
      }
    }
    return krViewerGridItems;
  }

  public static resetLocalKrSettings(krViewerGridItems: QueryResult[]): QueryResult[] {
    let localStorageResults = localStorage.getItem(LOCAL_STORAGE_PARAM.VERIFICATIONSETTINGS);
    if (!localStorageResults) {
      localStorage.setItem(LOCAL_STORAGE_PARAM.VERIFICATIONSETTINGS, JSON.stringify(DefaultLocalVerificationSettings));
      localStorageResults = localStorage.getItem(LOCAL_STORAGE_PARAM.VERIFICATIONSETTINGS);
    }
    let items: QueryResult[] = [];
    if (localStorageResults) {
      let localVerificationSettings = JSON.parse(localStorageResults);
      items = krViewerGridItems.map((item, index) => {
        const resetItem = { ...item, keyResultSettings: [] };
        if (item.oid in localVerificationSettings) {
          resetItem.color = localVerificationSettings[item.oid].color;
          localVerificationSettings[item.oid].keyResultSettings = [];
        } else {
          localVerificationSettings[item.oid] = {
            color: this.getColor(items, index),
            name: item.name,
            displayName: item.name,
            loadCaseCode: item.loadCaseCode,
            keyResultSettings: [],
            type: item.type,
            mirroredOid: undefined,
            mirror: item.mirror,
          };
        }
        return resetItem;
      });
      if (items && items.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_PARAM.VERIFICATIONSETTINGS, JSON.stringify(localVerificationSettings));
      }
    }
    return items;
  }

  public static getColor(krViewerGridItems: QueryResult[], index: number): string {
    let color;
    let krColors: string[] = KrSettingColors;
    if (krViewerGridItems.length <= krColors.length) color = krColors[index];
    else color = d3.interpolateRainbow(index / krViewerGridItems.length);
    krViewerGridItems[index].color = d3.color(color)?.formatHex();
    return color;
  }

  public static sortByProperty<DisplayResult>(
    resultArray: DisplayResult[],
    propName: keyof DisplayResult,
    order: 'asc' | 'desc'
  ): DisplayResult[] {
    resultArray.sort((a, b) => {
      if (a[propName] < b[propName]) {
        return -1;
      }
      if (a[propName] > b[propName]) {
        return 1;
      }
      return 0;
    });

    if (order === 'desc') {
      resultArray.reverse();
    }
    return resultArray;
  }

  public static sortByPropertyNumber<DisplayResult>(
    resultArray: DisplayResult[],
    propName: keyof DisplayResult,
    order: 'asc' | 'desc'
  ): DisplayResult[] {
    if (order === 'asc') {
      resultArray.sort((a, b) => Number(a[propName]) - Number(b[propName]));
    } else {
      resultArray.sort((a, b) => Number(b[propName]) - Number(a[propName]));
    }
    return resultArray;
  }

  public static changeOptionText(translateService: TranslateService): void {
    const addOptionKey: string = translateService.instant('krViewer.keyResult.add_option');
    const myContainer: any = <HTMLElement>document.getElementById('select_grid_option');
    if (
      myContainer &&
      myContainer.children['select_grid_option2'] &&
      myContainer.children['select_grid_option2']?.childNodes[0]?.childNodes[1]
    ) {
      myContainer.children['select_grid_option2'].childNodes[0].childNodes[1].innerText = '+ ' + addOptionKey;
      myContainer.children['select_grid_option2'].childNodes[0].childNodes[1].style.fontWeight = 'bold';
    }
  }

  public static getGridItemsWithIds(templateGroups: TemplateGroup[]): TemplateGroup[] {
    if (!templateGroups?.length) {
      return [];
    }
    return templateGroups.map((g) => {
      if (!g.sections.length) {
        return g;
      }

      const sections = g.sections.map((s) => {
        if (!s.gridConfig?.length) {
          return s;
        }

        const items = s.gridConfig.map((i) => {
          const test = { ...i, id: !!i.id ? i.id : v4(), parentId: s.id! };
          return { ...i, id: !!i.id ? i.id : v4(), parentId: s.id! };
        });
        return { ...s, gridConfig: items };
      });

      return { ...g, sections: sections };
    });
  }

  public static availableGroups(groups: TemplateGroup[]): string[] {
    return groups.filter((gridObject: TemplateGroup) => gridObject.isGroup).map((gridObject: TemplateGroup) => gridObject.group as string);
  }

  public static JSONReplacer(key: any, value: any): any {
    if (key === '$$hashKey') {
      return undefined;
    }
    return value;
  }

  public static setGridItemTitle(item: TemplateGridConfig | null | undefined, title: string): void {
    //@ts-ignore
    const containerEl = document.getElementById(item?.sortIndex) as HTMLElement;
    const gridTitleEl = containerEl.querySelector('.grid-item-title') as HTMLElement;

    gridTitleEl.innerHTML = title;
    gridTitleEl.title = title;
  }

  public static getResultDisplay(
    name: string,
    label_map: GridItemLabel,
    exisiting_labels: string[] | null = [],
    separator: any | null = null
  ): string {
    let proposed_label = label_map != null ? label_map[name] : null;
    separator = separator != null ? separator : '<br>';
    //TODO: get value from local storage
    let resultDisplay = 'label';
    if (!proposed_label || resultDisplay === 'name') {
      proposed_label = name;
    } else if (resultDisplay === 'name+label') {
      proposed_label = proposed_label + '<br>' + name;
    }

    if (!exisiting_labels) {
      return proposed_label;
    }

    let i = 0,
      label = cloneDeep(proposed_label);

    while (exisiting_labels.includes(label)) {
      if (i === 0) {
        if (resultDisplay === 'label') {
          proposed_label = proposed_label === name ? name : proposed_label + separator + name;
          label = cloneDeep(proposed_label);
        }
      } else {
        label = proposed_label + ' (' + String(i) + ')';
      }
      i++;
    }

    return label;
  }

  public static getKeyGridConfig(key: string, gridConfig: TemplateGridConfig | null | undefined): KeyGridConfig {
    let keyGridConfig!: KeyGridConfig;
    if (!key) return keyGridConfig;
    if (typeof gridConfig?.key === 'string' || gridConfig?.key instanceof String) return keyGridConfig;
    Object.keys(gridConfig?.key).some((gridConfigKey) => {
      var reg = new RegExp(this.escapeRegExp(gridConfigKey.split('.').join(':-:')).split('\\*').join('.*').split('\\?').join('.'));
      if (key.split('.').join(':-:').match(reg)) {
        keyGridConfig = gridConfig?.key[gridConfigKey];
      }
    });
    if (keyGridConfig != null && gridConfig?.keyResultType.startsWith('value')) {
      if (keyGridConfig?.output == null) keyGridConfig.output = 'nominal';
    } else if (keyGridConfig != null && gridConfig?.keyResultType.startsWith('document')) {
      if (keyGridConfig.output == null) keyGridConfig.output = 'content';
    }
    return keyGridConfig;
  }

  public static getKeyOdsGridConfig(key: string, gridConfig: TemplateGridConfig | null | undefined): KeyGridConfig {
    let keyGridConfig!: KeyGridConfig;
    if (!key) return keyGridConfig;
    if (typeof gridConfig?.key_ods === 'string' || gridConfig?.key_ods instanceof String) return keyGridConfig;
    Object.keys(gridConfig?.key_ods).some((gridConfigKey) => {
      var reg = new RegExp(this.escapeRegExp(gridConfigKey.split('.').join(':-:')).split('\\*').join('.*').split('\\?').join('.'));
      if (key.split('.').join(':-:').match(reg)) {
        keyGridConfig = gridConfig?.key_ods[gridConfigKey];
      }
    });
    if (keyGridConfig != null && gridConfig?.keyResultType.startsWith('value')) {
      if (keyGridConfig?.output == null) keyGridConfig.output = 'nominal';
    } else if (keyGridConfig != null && gridConfig?.keyResultType.startsWith('document')) {
      if (keyGridConfig.output == null) keyGridConfig.output = 'content';
    }
    return keyGridConfig;
  }

  public static escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  public static getAllKeysWithoutWildcard(gridConfig: TemplateGridConfig | null | undefined, availableKeys: string[]): string[] {
    const keysWihtoutWildcard: string[] = [];
    const unsortedKeyList = Object.keys(gridConfig?.key).map((key) => [
      key,
      gridConfig?.key[key].sortIndex != undefined ? gridConfig?.key[key].sortIndex : Infinity,
    ]);

    unsortedKeyList
      .sort(function (a, b) {
        return a[1] - b[1];
      })
      .forEach((gridConfigKeyAndIndex) => {
        const gridConfigKey = gridConfigKeyAndIndex[0];
        if (!gridConfigKey.includes('*')) {
          keysWihtoutWildcard.push(gridConfigKey);
        } else {
          let reg = new RegExp(
            '^' + this.escapeRegExp(gridConfigKey.split('.').join(':-:')).split('\\*').join('.*').split('\\?').join('.') + '$'
          );
          availableKeys.forEach((availableKey: string) => {
            if (availableKey.split('.').join(':-:').match(reg) && !keysWihtoutWildcard.includes(availableKey)) {
              keysWihtoutWildcard.push(availableKey.split(':-:').join('.'));
            }
          });
        }
      });
    return keysWihtoutWildcard;
  }

  public static getResultGroups(resultGroups: ResultGroup | null): Group[] {
    //TODO get group after implementing KR viewer Groups
    if (!resultGroups?.active) {
      return [];
    }
    return cloneDeep(resultGroups.groups);
  }

  public static getResultGroup(oid: string, resultGroups: ResultGroup | null): Group | null {
    if (!resultGroups?.active) {
      return null;
    }

    const currentGroup = resultGroups.groups.find((currentGroup) => currentGroup.oids.includes(oid));

    if (!currentGroup) {
      return null;
    }

    return currentGroup;
  }

  public static getResultGroupCurrent(oid: string, resultGroups: ResultGroup | null): Group | null {
    if (resultGroups?.active !== GroupInfo.ACTIVE || !this.checkResultGroupHasVerifications(resultGroups)) {
      return null;
    }

    const currentGroup = resultGroups.groups.find((currentGroup) => currentGroup.oids.includes(oid));

    if (!currentGroup) {
      return null;
    }
    if (!KrviewerUtils.getTraceVisibilityByGroup(resultGroups, oid)) {
      return null;
    }

    return currentGroup;
  }

  public static hexToRGB(hex: string, alpha: number): string {
    let r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);
    if (alpha) {
      return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
    } else {
      return 'rgb(' + r + ', ' + g + ', ' + b + ')';
    }
  }

  public static getImageUrl(item: GridItemQueryResult): string {
    let path = '/Car/Data/' + item.result.text + '/' + item.type + '/' + item.name;
    let data = {
      action: PreviewActionType.DOWNLOAD,
      path: path,
      oid: item.oid,
    } as MediaActionUrlData;
    return path && [PreviewActionType.DOWNLOAD, TreeUtils.toMediaUrl(data)].join('?');
  }

  public static getOdsImageUrl(item: GridItemQueryResult): string {
    let data = {
      action: PreviewActionType.DOWNLOAD,
      type: item.content,
      item: item.name,
      oid: item.oid,
    } as MediaActionUrlData;
    return [PreviewActionType.DOWNLOAD_ODS, TreeUtils.toMediaUrl(data)].join('?');
  }

  public static toVideoUrl(item: GridItemQueryResult, videoFormat: VideoFormat): string {
    let path = '/Car/Data' + item.result.text + 'KeyResult' + KrviewerUtils.capitalizeFirstLetter(item.type);
    let dataWebm = {
      action: PreviewActionType.VIDEO,
      oid: item.oid,
      expr: 'movie.data.movie',
      format: videoFormat,
    } as MediaActionUrlData;
    return [PreviewActionType.VIDEO, TreeUtils.toMediaUrl(dataWebm)].join('?');
  }

  public static getKeyResultVerificationSetting(verificationName: string, key: string): any {
    let localStorageResults = localStorage.getItem(LOCAL_STORAGE_PARAM.VERIFICATIONSETTINGS);
    let localVerificationSettings: any;
    if (localStorageResults) {
      localVerificationSettings = JSON.parse(localStorageResults);
      const keyResultVerificationSetting: any = localVerificationSettings[verificationName];

      if (!keyResultVerificationSetting || !Array.isArray(keyResultVerificationSetting.keyResultSettings)) {
        return;
      }

      const keyResultSetting = keyResultVerificationSetting.keyResultSettings.find((x: any) => {
        if (x.key == null || x.options == null) {
          return;
        }
        const reg = new RegExp(this.escapeRegExp(x.key.split('.').join(':-:')).split('\\*').join('.*').split('\\?').join('.'));
        return key.match(reg);
      });
      if (!keyResultSetting) {
        return;
      }
      try {
        return JSON.parse(keyResultSetting.options);
      } catch (e) {
        alert('Error in setting for verification ' + verificationName + ' and key ' + key + ': ' + e);
        return;
      }
    }
  }

  public static displayName(key: string): string {
    let localStorageResults = localStorage.getItem(LOCAL_STORAGE_PARAM.VERIFICATIONSETTINGS);
    let localVerificationSettings: LocalVerificationSettings;
    if (localStorageResults) {
      localVerificationSettings = JSON.parse(localStorageResults);
    }
    //@ts-ignore
    if (localVerificationSettings[key]) return localVerificationSettings[key].displayName;
    return key;
  }

  public static colorScale(resultOid: string): string {
    let color: string = '';
    let localStorageResults = localStorage.getItem(LOCAL_STORAGE_PARAM.VERIFICATIONSETTINGS);
    let localVerificationSettings: any;
    if (localStorageResults) {
      localVerificationSettings = JSON.parse(localStorageResults);

      if (localVerificationSettings[resultOid]) {
        return localVerificationSettings[resultOid].color;
      }
    }
    //@ts-ignore
    return this.ordinalColorScale(resultOid);
  }

  public static getHoverFormat(gridConfig: TemplateGridConfig | null | undefined, defaultFormat?: string): string {
    if (!gridConfig?.hoverinfo) {
      return defaultFormat ? defaultFormat : 'x+y+text';
    }
    if (gridConfig.hoverinfo === 'simple') {
      return 'x+y';
    }
    return gridConfig.hoverinfo;
  }

  public static getTitle(gridConfig: TemplateGridConfig | null | undefined): string {
    return gridConfig?.title ? gridConfig.title : this.getGridConfigKeys(gridConfig);
  }

  public static getGridConfigKeys(gridConfig: TemplateGridConfig | null | undefined): string {
    if (gridConfig?.key == null) {
      return '';
    }
    if (typeof gridConfig.key === 'string' || gridConfig.key instanceof String) {
      return gridConfig.key as string;
    } else {
      let keys = Object.keys(gridConfig.key).filter((key) => !gridConfig.key[key] || gridConfig.key[key].negate !== true),
        negate_keys = Object.keys(gridConfig.key)
          .filter((key) => gridConfig.key[key] && gridConfig.key[key].negate === true)
          .map((key) => `!${key}`);

      if (!!keys.length && !!negate_keys.length) {
        return `${keys.join(' ')} and ${negate_keys.join(' ')}`;
      } else if (!!negate_keys.length) {
        return negate_keys.join(' ');
      } else {
        return keys.join(' ');
      }
    }
  }

  public static getAvailableKeys(data: GridItemData): string[] {
    return uniq(
      Object.values(data)
        .map((values) => Object.keys(values))
        .flat()
    );
  }

  public static getGridConfig(sectionGrid: TemplateGroup[]): TemplateConfig[] {
    let config: TemplateConfig[] | null | undefined = [];
    sectionGrid?.forEach((item: TemplateGroup) => {
      item.sections.forEach((section: TemplateConfig) => {
        config?.push(section);
      });
    });
    return config;
  }

  public static isBooleanList(optionList: string[] | any): boolean {
    return optionList.includes(true) || optionList.includes('true') || optionList.includes(false) || optionList.includes('false');
  }

  public static getOnlySections(data: TemplateGroup[]): TemplateConfig[] {
    const sections: TemplateConfig[] = [];
    data.forEach((group: TemplateGroup) => {
      group.sections.forEach((s: TemplateConfig) => {
        sections.push(s);
      });
    });

    return sections;
  }

  public static convertToGroupedTemplate(template: Template): GROUPED_TEMPLATE[] {
    let data: GROUPED_TEMPLATE[] = [];
    if (!template || !Object.keys(template).length) {
      return data;
    }

    data = template?.config.reduce((data: GROUPED_TEMPLATE[], { group }) => {
      if (!data.some((o) => o.group == group))
        data.push({
          id: uuid.v4(),
          group,
          allChecked: true,
          groupItem: template?.config.filter((v) => v.group == group),
        } as GROUPED_TEMPLATE);
      return data;
    }, []);

    return data;
  }

  public static clearPayloadTemplateData(template: Template): Template {
    const config = template.config?.map((s) => {
      const items = s.gridConfig?.map((i) => omit({ ...i }, ['id', 'parentId', 'visible']));
      return omit({ ...s, gridConfig: items }, ['id', 'showItems', 'show']);
    });

    const payloadTemplate: Partial<Template> = omit(
      {
        ...template,
        config: config,
      } as Template,
      ['customId', 'predecessorUuid']
    );

    return payloadTemplate as Template;
  }

  public static setGroups(resultGroup: ResultGroup, notYetIncludedKeys: QueryResult[]): ResultGroup {
    let groups = resultGroup.groups;
    resultGroup.groups = [];

    let selectedOids: string[] = [];
    let alreadyAvailableKeys: string[] = [];
    groups.forEach((group) => {
      if (group.name !== 'All Remaining') {
        group.oids = group.oids.filter((groupOid) => !alreadyAvailableKeys.includes(groupOid));
        alreadyAvailableKeys = [...alreadyAvailableKeys, ...group.oids];
        resultGroup.groups.push(group);
        notYetIncludedKeys = notYetIncludedKeys.filter((notYetIncludedKey) => !group.oids.includes(notYetIncludedKey.oid));
      }
    });

    if (notYetIncludedKeys.length !== 0) {
      notYetIncludedKeys = notYetIncludedKeys?.filter((notYetIncludedKey) => {
        selectedOids.push(notYetIncludedKey.oid);
      });
      const remainingGroup = resultGroup.groups.find((currentGroup) => currentGroup.name === 'All Remaining');
      if (remainingGroup) {
        remainingGroup.oids = selectedOids;
        resultGroup.groups.push(remainingGroup);
      } else
        resultGroup.groups.push({
          name: 'All Remaining',
          oids: selectedOids,
          color: '#330000',
          visible: GroupInfo.VISIBLE,
        } as Group);
    }

    return resultGroup;
  }

  public static getTraceNameByGroup(resultGroup: ResultGroup | undefined | null, verificationOid: string): string {
    let trace_name: string = '';
    resultGroup?.groups.map((item: Group) => {
      if (item.oids.includes(verificationOid)) {
        trace_name = 'Group ' + item.name;
      }
    });
    return trace_name;
  }

  public static getTraceColorByGroup(resultGroup: ResultGroup | undefined | null, verificationOid: string): string {
    let color: string = '';
    resultGroup?.groups.map((item: Group) => {
      if (item.oids.includes(verificationOid)) {
        color = item.color;
      }
    });
    return color;
  }

  public static getTraceVisibilityByGroup(resultGroup: ResultGroup | undefined | null, verificationOid: string): boolean {
    let visibility: boolean = false;
    resultGroup?.groups.map((item: Group) => {
      if (item.oids.includes(verificationOid) && item.visible === GroupInfo.VISIBLE) {
        visibility = true;
      }
    });
    return visibility;
  }

  public static getTraceVisibilityForFormula(verificationOid: string): boolean {
    let visibility: boolean = false;
    if (verificationOid.split(':').length === 1 && verificationOid.split(';').length === 1) {
      visibility = true;
    }
    return visibility;
  }

  public static colorScaleFormula(
    resultOid: string,
    keyResultOid?: string,
    gridConfig?: any,
    additionalInfo?: any,
    resultGroups?: ResultGroup
  ): string {
    let colorMap: any = { common: '#5d7dc5', anomaly: '#e51c23', peculiar: '#ff9800' };
    if (gridConfig != null) {
      if (gridConfig.colorByClassification && keyResultOid && additionalInfo) {
        const invalidResult = additionalInfo.find(
          (classificationResult: any) => classificationResult.result.oid === resultOid && classificationResult.oid === keyResultOid
        );
        if (invalidResult) return colorMap[invalidResult.label];
      }
      if (gridConfig.color) return gridConfig.color;
    }

    let currentGroup = this.getResultGroup(resultOid, resultGroups!);
    if (currentGroup && currentGroup.color) {
      return currentGroup.color;
    }

    // need to write for verification setting color
    let localStorageResults = localStorage.getItem(LOCAL_STORAGE_PARAM.VERIFICATIONSETTINGS);
    let localVerificationSettings: any;
    if (localStorageResults) {
      localVerificationSettings = JSON.parse(localStorageResults);

      if (localVerificationSettings[resultOid]) {
        return localVerificationSettings[resultOid].color;
      }
    }

    console.log(d3.scaleOrdinal().range(d3.schemeTableau10));
    console.log(d3.schemeTableau10);
    console.log(resultOid);
    console.log(d3.scaleOrdinal().range(d3.schemeTableau10)(resultOid));

    //@ts-ignore
    return d3.scaleOrdinal().range(d3.schemeTableau10)(resultOid);
  }

  public static getAlltracesExistsOrNot(resultGroup: ResultGroup | undefined | null, ValueItemData: ValueItemData): boolean {
    let nothing_found = false;
    let traceCount: number = 0;
    Object.keys(ValueItemData.data).forEach((data_key) => {
      if (this.getTraceVisibilityByGroup(resultGroup, data_key)) {
        traceCount++;
      }
    });
    if (traceCount === 0) {
      nothing_found = true;
    }
    return nothing_found;
  }

  public static getAllRowsExistsOrNot(resultGroup: ResultGroup | undefined | null, rowsData: TableRowDefinition[]): boolean {
    let nothing_found = false;
    let rowCount: number = 0;
    rowsData.forEach((row) => {
      if (this.getTraceVisibilityByGroup(resultGroup, row['oid'])) {
        rowCount++;
      }
    });
    if (rowCount === 0) {
      nothing_found = true;
    }
    return nothing_found;
  }

  public static getAllResultsExistsOrNot(resultGroup: ResultGroup | undefined | null, result: GridItemQueryResult[]): boolean {
    let nothing_found = false;
    let rowCount: number = 0;
    result.forEach((response) => {
      if (this.getTraceVisibilityByGroup(resultGroup, response.result.oid)) {
        rowCount++;
      }
    });
    if (rowCount === 0) {
      nothing_found = true;
    }
    return nothing_found;
  }

  public static checkResultGroupActiveOrNot(resultGroup: ResultGroup | undefined | null): boolean {
    return resultGroup?.active === GroupInfo.ACTIVE && this.checkResultGroupHasVerifications(resultGroup);
  }

  public static checkResultGroupHasVerifications(resultGroup: ResultGroup | null): boolean {
    if (resultGroup?.groups && resultGroup?.groups.length > 0) {
      const found = resultGroup?.groups.find((group) => group.oids.length > 0);
      if (found) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  public static getQueryOids(res: QueryResponse): string[] {
    let oids: string[] = [];
    if (res.rows.length > 0) {
      res.rows.forEach((row: Row) => {
        oids.push(row.oid);
      });
    }
    return oids;
  }

  public static getViewPayLoadParam(): any {
    return [
      'name',
      'createdAt',
      'keyResultCount',
      "inputDeck:InputDeck.simulationDef.scenario.properties:StringProperty[name=='BMW_code'].value",
      "properties:DateProperty[name=='DateOfTheTest'].value",
      'inputDeck:InputDeck.variant',
      'inputDeck:InputDeck.variant.phase',
    ];
  }

  public static isStringItem(item: any): boolean {
    return typeof item === 'string' || item instanceof String;
  }

  public static getColorAutoGroups(inputMap: any, index: number): string {
    let color: any;
    let krColors: string[] = KrSettingColors;
    if (index <= krColors.length - 1) color = krColors[index];
    else color = d3.interpolateRainbow(index / inputMap?.length);
    color = d3.color(color)?.formatHex();
    return color;
  }

  public static getColorAutoGroupsODS(inputMap: any, index: number): string {
    let color: any;
    let krColors: string[] = KrODSSettingColors;
    if (index <= krColors.length - 1) color = krColors[index];
    else color = d3.interpolateRainbow(index / inputMap?.length);
    color = d3.color(color)?.formatHex();
    return color;
  }

  public static extractAdditionalInfo(resultItems: GridItemQueryResult[]): ClassificationResult[] {
    return resultItems
      .map((entry: GridItemQueryResult) => {
        const classificationClass = entry.classification_info && entry.classification_info.class,
          classificationLabel = entry.classification_info && entry.classification_info.class,
          edited = entry.edited,
          measuring_error = entry.measuring_error;
        let url;

        if (classificationClass && classificationLabel) {
          const test_name = entry.result.text.split('_').pop();
          const key_result_type = entry.type.replace('KeyResult', '').toLowerCase();
          url = `/classificationWizard#!/${test_name}/${key_result_type}?key_result_oid=${entry.oid}`;
        }
        if (url || edited || measuring_error) {
          return {
            result: entry.result,
            name: entry.name,
            oid: entry.oid,
            class: entry.classification_info.class,
            label: entry.classification_info.label,
            url: url,
            edited: edited,
            measuring_error: measuring_error,
          } as ClassificationResult;
        }

        return null;
      })
      .filter(Boolean) as ClassificationResult[];
  }

  public static filterResults(
    resultItems: GridItemQueryResult[],
    additionalInfo: ClassificationResult[],
    gridConfig: TemplateGridConfig
  ): GridItemQueryResult[] {
    if (gridConfig.filterRegExp != null) {
      const filterRegExp = new RegExp(gridConfig.filterRegExp, 's');

      resultItems = resultItems.filter((resultItem) => filterRegExp.exec(resultItem.name) != null);
    }
    if (gridConfig.uniqueFilterRegExp != null) {
      const uniqueFilterRegExp = new RegExp(gridConfig.uniqueFilterRegExp, 's');

      resultItems = uniqBy(resultItems, (resultItem) => {
        const filterResult = uniqueFilterRegExp.exec(resultItem.name);
        if (filterResult) return resultItem.result.oid + filterResult[1];
        else return resultItem.result.oid;
      });
    }
    if (gridConfig.filterInvalidResults != null)
      return resultItems.filter((entry) => {
        const invalidResult: ClassificationResult | undefined = additionalInfo.find(
          (classificationResult: ClassificationResult) =>
            classificationResult.result.oid === entry.result.oid && classificationResult.oid === entry.oid
        );

        if (gridConfig.filterInvalidResults === 'exclude') {
          return !this.resultIsInvalid(invalidResult);
        }
        return this.resultIsInvalid(invalidResult);
      });
    return resultItems;
  }

  public static resultIsInvalid(classificationResult: ClassificationResult | undefined): boolean {
    if (!classificationResult) {
      return false;
    }
    return classificationResult.class === 'invalid' || classificationResult.label === 'anomaly';
  }

  public static formatNumber(value: number, fractionDigits: number, exponential: boolean = false): string {
    if (isNaN(value)) {
      return value.toString();
    }
    if (exponential) {
      return value.toExponential(fractionDigits);
    } else {
      return value.toFixed(fractionDigits);
    }
  }

  public static formatString(stri: string, formatRegex: any): string {
    if (stri == null) return stri;
    if (!(formatRegex instanceof RegExp)) {
      formatRegex = new RegExp(formatRegex);
    }
    if (`${stri}`.match(formatRegex)) {
      return `${stri}`.match(formatRegex)![1];
    }
    return stri;
  }

  public static getSortedVisibleSelections(
    resultGroups: ResultGroup | null,
    selectedOids: QueryResult[],
    reverse: boolean = false
  ): string[] {
    const groups: Group[] = this.getResultGroups(resultGroups);
    let selections: string[] = selectedOids.map((s) => s.oid);
    if (!!groups.length) {
      selections = uniq(
        groups.filter((resultGroup: Group) => resultGroup.visible !== GroupInfo.HIDDEN).flatMap((resultGroup) => resultGroup.oids)
      ).filter((selection) => selections.includes(selection));
    }

    return reverse ? selections.reverse() : selections;
  }

  public static convertUnitDisplay(unit: any): string | any {
    return this.isString(unit) ? unit.split('_per_').join('/').split('__').join('^') : unit;
  }

  public static checkLabelUnits(label: string, units: any): string {
    if (!this.isString(label) || !Array.isArray(units)) return label;
    const matchedReg = label.match(/.*?\s\[(.*?)\]$/);
    if (!matchedReg) {
      return label.replace('<unit>', `[${uniq(units.map((unit) => this.convertUnitDisplay(unit))).join(' ')}]`);
    }
    let additionalUnits: string[] = [];
    units.forEach((unit) => {
      if (this.isString(unit) && this.convertUnitDisplay(matchedReg[1].toLowerCase()) !== this.convertUnitDisplay(unit.toLowerCase())) {
        additionalUnits.push(this.convertUnitDisplay(unit));
      }
    });

    if (additionalUnits.length) {
      label = `${label} &#9888; Displayed in [${uniq(additionalUnits).join(' ')}] &#9888;`;
      console.warn(`${label} &#9888; Displayed in [${uniq(additionalUnits).join(' ')}] &#9888;`);
    }
    return label;
  }

  public static getMinMaxCurveInfo(
    x: number[],
    x_min: number,
    x_max: number,
    y: number[],
    y_min: number,
    y_max: number,
    returnInfo: any
  ): any[] {
    const result: any = returnInfo ? { x: {}, y: {} } : null;
    let [minX, maxX] = this.arrayMinMax(x);
    if (result) {
      result.x.min = cloneDeep(minX);
      result.x.max = cloneDeep(maxX);
      result.x.min_y = y[x.indexOf(minX)];
      result.x.max_y = y[x.indexOf(maxX)];
    }
    [minX, maxX] = this.arrayMinMax([minX, maxX], x_min, x_max);

    let [minY, maxY] = this.arrayMinMax(y);
    if (result) {
      result.y.min = cloneDeep(minY);
      result.y.max = cloneDeep(maxY);
      result.y.min_x = x[y.indexOf(minY)];
      result.y.max_x = x[y.indexOf(maxY)];
    }
    [minY, maxY] = this.arrayMinMax([minY, maxY], y_min, y_max);

    return [minX, maxX, minY, maxY, result];
  }

  public static arrayMinMax(arr: any[], min: number | null = null, max: number | null = null): any {
    let len = arr.length;
    if (min === null) {
      min = Infinity;
    }
    if (max === null) {
      max = -Infinity;
    }
    while (len--) {
      if (arr[len] < min!) {
        min = arr[len];
      }
      if (arr[len] > max!) {
        max = arr[len];
      }
    }
    return [min, max];
  }

  public static getCustomContinousColorScale(
    zArray: number[],
    customColorScale?: {
      domain?: number[];
      range?: string[];
    }
  ): {
    newCustomScale: Array<Array<number | string>> | undefined;
    tickvals: number[] | undefined;
  } {
    let linearScale = d3.scaleLinear().domain(this.arrayMinMax(zArray)).range([0, 1]);
    let tickvals: number[] | undefined = undefined;
    let colorScale: Array<Array<number | string>>;
    let newCustomScale: Array<Array<number | string>> | undefined = undefined;

    if (!!customColorScale && !!customColorScale.domain && !!customColorScale.range) {
      colorScale = zip(customColorScale.domain, customColorScale.range) as Array<Array<number | string>>;
      tickvals = colorScale.map((entry: any) => entry[0]);

      colorScale
        .map((entry: Array<number | string>, index: number) => {
          // @ts-ignore
          let mappedValue: number = Math.min(1, Math.max(0, linearScale(entry[0] as number)));
          let nextMappedValue: number;

          if (index == 0) {
            mappedValue = 0;
          }

          if (index == colorScale.length - 1) {
            nextMappedValue = 1;
          } else {
            // @ts-ignore
            nextMappedValue = Math.min(1, Math.max(0, linearScale(colorScale[index + 1][0] as number)));
          }
          newCustomScale = [
            ...(newCustomScale || []),
            ...[
              [mappedValue, entry[1]],
              [nextMappedValue, entry[1]],
            ],
          ];
        })
        .filter(Boolean);
    }

    return { newCustomScale, tickvals };
  }

  public static isString = (_string: any): boolean => typeof _string === 'string' || _string instanceof String;

  public static nestedGet = (from: any, ...selectors: any[]): any =>
    [...selectors].map((s) =>
      s
        .replace(/\[([^\[\]]*)\]/g, '.$1.')
        .split('.')
        .filter((t: any) => t !== '')
        .reduce((prev: any, cur: any) => prev && prev[cur], from)
    );

  public static isLimitList = (limitList: any): any =>
    Array.isArray(limitList) && limitList.every((entry: any) => !this.isObject(entry) && entry != null);

  public static isObject = (val: any): any => val && typeof val === 'object' && !Array.isArray(val) && val !== null;

  public static isNumeric = (_string: any): boolean => {
    if (this.isString(_string)) return false; // we only process strings!
    return (
      !isNaN(_string) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
      !isNaN(parseFloat(_string))
    ); // ...and ensure strings of whitespace fail
  };

  public static between(x: number, min: number, max: number): boolean {
    return x >= min && x <= max;
  }

  public static getResultItem(identifier: string, result: any[]): any {
    let resultItem;
    result.forEach((item: any) => {
      if (identifier === item.oid) {
        resultItem = item;
      }
    });
    return resultItem;
  }

  public static getSelectedOids(selectedData: any): any {
    let selectedOids: any = [];
    selectedData.forEach((element: any) => {
      if (this.isObject(element)) {
        selectedOids.push(element?.oid);
      } else {
        selectedOids.push(element);
      }
    });
    return selectedOids;
  }

  public static mirrorAnyVerification(selectedOids: QueryResult[]): boolean {
    let selections: string[] = selectedOids.map((s) => s.oid);
    return selections.some((selection) => this.mirrorVerification(selection));
  }

  public static mirrorVerification(verificationOid: string): boolean {
    let localStorageResults = localStorage.getItem(LOCAL_STORAGE_PARAM.VERIFICATIONSETTINGS);
    let localVerificationSettings: any;
    if (localStorageResults) {
      localVerificationSettings = JSON.parse(localStorageResults);
      return localVerificationSettings[verificationOid] ? localVerificationSettings[verificationOid].mirror : false;
    }
    return false;
  }

  public static getOriginalTitle(gridConfig: TemplateGridConfig): string {
    const keyArray: string[] = [];
    Object.keys(gridConfig?.key).forEach((key) => {
      keyArray.push(key);
    });

    return keyArray.join(' ');
  }

  public static generateQueryRequestForMacros(selections: any, macroName: string, index: number): QueryRequest {
    let expr: string = '',
      oid_string: string;
    oid_string = KR_GRID_PARAMS.objectIdString + selections[index].oid.split(':')[0] + "']";

    if (macroName === KrGridMacros.VERTICALLINE || macroName === KrGridMacros.HORIZONTALLINE) {
      expr = oid_string + KR_GRID_PARAMS.keyResultMacroString;
    } else {
      expr = oid_string + KR_GRID_PARAMS.keyresultCurveString;
    }
    const queryRequest: QueryRequest = {
      action: ACTION.QUERY,
      type: KR_QUERY_TYPE.RESULT,
      expr: expr,
      return_type: RETURN_TYPE.LIST,
      limit: KR_GRID_PARAMS.limit,
      offset: KR_GRID_PARAMS.offset,
      search: KR_GRID_PARAMS.search,
      views: KR_GRID_PARAMS.views,
    };
    return queryRequest;
  }

  public static linearRegression(x: any[], y: any[]): any {
    let lr: any = {};
    let n = y.length;
    let sum_x = 0;
    let sum_y = 0;
    let sum_xy = 0;
    let sum_xx = 0;
    let sum_yy = 0;

    for (let i = 0; i < y.length; i++) {
      sum_x += x[i];
      sum_y += y[i];
      sum_xy += x[i] * y[i];
      sum_xx += x[i] * x[i];
      sum_yy += y[i] * y[i];
    }

    lr['sl'] = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
    lr['off'] = (sum_y - lr.sl * sum_x) / n;
    lr['r2'] = Math.pow((n * sum_xy - sum_x * sum_y) / Math.sqrt((n * sum_xx - sum_x * sum_x) * (n * sum_yy - sum_y * sum_y)), 2);

    return lr;
  }
  public static setAdditionalInformation(info: ClassificationResult[]): void {
    this.additionalInformation = info;
  }
  public static getAdditionalInformation(): any {
    return this.additionalInformation;
  }

  public static setGridConfig(gridConfig: TemplateGridConfig): void {
    this.gridInfo = gridConfig;
  }
  public static getGridInfo(): any {
    return this.gridInfo;
  }
  public static generateIdBasedOnKeyResultType(data: any): string {
    let idVal;
    switch (data?.item?.keyResultType) {
      case KrGridOptions.CURVE: {
        idVal = data.item.id + '' + KrGridOptions.CURVE;
        break;
      }
      case KrGridOptions.METADATA: {
        if (data?.item?.type === KrGridOptions.TABLE) {
          idVal = data.item.id + '' + KrGridOptions.TABLE;
        } else {
          idVal = data.item.id;
        }

        break;
      }
      case KrGridOptions.VALUE: {
        if (data?.item?.type === KrGridOptions.TABLE) {
          idVal = data.item.id + '' + KrGridOptions.TABLE;
        } else {
          idVal = data.item.id + '' + KrGridOptions.VALUE;
        }

        break;
      }
      case KrGridOptions.VALUE_DOCUMENT: {
        if (data?.item?.type === KrGridOptions.TABLE) {
          idVal = data.item.id + '' + KrGridOptions.TABLE;
        } else {
          idVal = data.item.id + '' + KrGridOptions.VALUE;
        }

        break;
      }
      case KrGridOptions.VALUE3D: {
        if (data?.item?.type === KrGridOptions.TABLE) {
          idVal = data.item.id + '' + KrGridOptions.TABLE;
        } else {
          idVal = data.item.id + '' + KrGridOptions.VALUE3D;
        }

        break;
      }
      case KrGridOptions.DOCUMENT: {
        if (data?.item?.type === KrGridOptions.TABLE) {
          idVal = data.item.id + '' + KrGridOptions.TABLE;
        } else {
          idVal = data.item.id + '' + KrGridOptions.VALUE;
        }

        break;
      }
      case KrGridOptions.MOVIE: {
        idVal = data.item.id + '' + KrGridOptions.VIDEO;
        break;
      }
      case KrGridOptions.IMAGE: {
        idVal = data.item.id + '' + KrGridOptions.PICTURE;
        break;
      }
      case KrGridOptions.TEXT: {
        idVal = data.item.id + '' + KrGridOptions.TEXT;
        break;
      }
      case KrGridOptions.PICTURE: {
        idVal = data.item.id + '' + KrGridOptions.PICTURE;
        break;
      }
      default: {
        idVal = data.item.id;
        break;
      }
    }
    return idVal;
  }

  public static mergeResultGroups(resultGroup: ResultGroup, resultGroupODS: ResultGroup): ResultGroup {
    if (!resultGroup && !resultGroupODS) return { active: 'Active', groups: [] } as ResultGroup;
    if (!resultGroupODS) return resultGroup;
    if (!resultGroup) return resultGroupODS;
    let activeGroups: Group[] = [];
    let active: string = 'Inactive';
    let _resultGroup = cloneDeep(resultGroup);
    let _resultGroupODS = cloneDeep(resultGroupODS);

    if (resultGroup?.active === 'Active') {
      active = resultGroup?.active;
      let filterGroups = _resultGroup!.groups.filter((d) => !d.name.includes('All Remaining'));
      activeGroups.push(...filterGroups);
    }

    if (resultGroupODS?.active === 'Active') {
      active = resultGroupODS?.active;
      let filterGroups = _resultGroupODS!.groups.filter((d) => !d.name.includes('All Remaining'));
      activeGroups.push(...filterGroups);
    }

    let filterAllRemaing = _resultGroup!.groups.filter((d) => d.name.includes('All Remaining'));
    if (filterAllRemaing.length > 0) {
      let index = activeGroups.findIndex((item) => item.name.includes('All Remaining'));
      if (index !== -1) {
        let mergeIds = [...activeGroups[index].oids, ...filterAllRemaing[0].oids];
        activeGroups[index].oids = Array.from(new Set(mergeIds));
        if (activeGroups[index].visible !== 'Hidden') {
          activeGroups[index].visible = filterAllRemaing[0].visible;
        }
      } else {
        activeGroups.push(...filterAllRemaing);
      }
    }

    let filterAllRemaingODS = _resultGroupODS!.groups.filter((d) => d.name.includes('All Remaining'));
    if (filterAllRemaingODS.length > 0) {
      let index = activeGroups.findIndex((item) => item.name.includes('All Remaining'));
      if (index !== -1) {
        let mergeIds = [...activeGroups[index].oids, ...filterAllRemaingODS[0].oids];
        activeGroups[index].oids = Array.from(new Set(mergeIds));
        if (activeGroups[index].visible !== 'Hidden') {
          activeGroups[index].visible = filterAllRemaingODS[0].visible;
        }
      } else {
        activeGroups.push(...filterAllRemaingODS);
      }
    }

    if (resultGroup?.active === 'Inactive') {
      let filterGroups = _resultGroup!.groups.filter((d) => !d.name.includes('All Remaining'));
      if (filterGroups.length > 0) {
        let index = activeGroups.findIndex((item) => item.name.includes('All Remaining'));
        if (index !== -1) {
          let mergeIds: string[] = [];
          filterGroups.forEach((s) => {
            mergeIds = [...activeGroups[index].oids, ...s.oids];
          });
          activeGroups[index].oids = Array.from(new Set(mergeIds));
        }
      }
    }

    if (resultGroupODS?.active === 'Inactive') {
      let filterGroups = _resultGroupODS!.groups.filter((d) => !d.name.includes('All Remaining'));
      if (filterGroups.length > 0) {
        let index = activeGroups.findIndex((item) => item.name.includes('All Remaining'));
        if (index !== -1) {
          let mergeIds: string[] = [];
          filterGroups.forEach((s) => {
            mergeIds = [...activeGroups[index].oids, ...s.oids];
          });
          activeGroups[index].oids = Array.from(new Set(mergeIds));
        }
      }
    }

    let _activeGroups = activeGroups.filter((d) => !d.name.includes('All Remaining'));
    let activeGroupsAllRemaing = activeGroups.filter((d) => d.name.includes('All Remaining'));
    let AllRemaingOids: string[] = [];
    if (activeGroupsAllRemaing.length > 0) {
      AllRemaingOids = activeGroupsAllRemaing[0].oids;
    }
    _activeGroups.forEach((group) => {
      let Oids = group.oids;
      AllRemaingOids = AllRemaingOids.filter((item) => !Oids.includes(item));
    });

    let index = activeGroups.findIndex((item) => item.name.includes('All Remaining'));
    if (index !== -1) {
      activeGroups[index].oids = Array.from(new Set(AllRemaingOids));
    }

    let mergedResultGroup = {
      active: active,
      groups: activeGroups,
    };
    return mergedResultGroup as ResultGroup;
  }
}

export interface TemplateItems {
  [name: string]: TemplateConfig[];
}

export interface TemplateGroup {
  id?: string;
  group?: string;
  isGroup: boolean;
  sections: TemplateConfig[];
  showSection?: boolean;
  expanded?: boolean;
  editable?: boolean;
}

export interface TreeNodeChild extends TreeNode {
  id?: string;
  checked?: boolean;
  color?: string;
  group?: string | null;
  section?: string;
  showItems?: boolean;
  show?: boolean;
  gridConfig?: TemplateGridConfig[];
  parentId?: string;
}

export interface TreeNodeGroup extends TreeNode {
  id?: string;
  group?: string;
  isGroup: boolean;
  sections: TreeNodeChild[];
  showSection?: boolean;
  editable?: boolean;
  type?: TreeNodeType;
  parentId?: string;
}

export enum TreeNodeType {
  GROUP = 'group',
  SECTION = 'section',
}

export interface IGridInfo {
  item: Item;
  itemData: TemplateGridConfig;
  indexFrom: number;
  indexTo: number;
  gridFrom: Grid;
  gridFromName: string;
  gridFromData: Item[];
  gridTo: Grid;
  gridToName: string;
  gridToData: Item[];
  gridFromDataConfig: TemplateGridConfig[];
  gridToDataConfig: TemplateGridConfig[];
}

export interface IRegisteredGrid {
  grid: Grid;
  name: string;
  connected?: Array<Grid>;
}

export enum GroupInfo {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  VISIBLE = 'Visible',
  HIDDEN = 'Hidden',
  NEWGROUP = 'New Group',
  GROUPCOLOR = '#000000',
  PROPERTYOID = 'oid',
  PROPERTYEXPR = 'expr',
  PROPERTYNAME = 'name',
  PROPERTYCOLOR = 'color',
  PROPERTYVISIBILITY = 'visibility',
  PROPERTYGROUPEDITABLE = 'editable',
}
