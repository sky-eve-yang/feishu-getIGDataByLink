import { bitable, FieldType } from '@lark-base-open/js-sdk';
import { TEXT_FIELD_ARRAY, DATETIME_FIELD_ARRAY, NUMBER_FIELD_ARRAY, BASE_I18N_FIELD_PATH } from '../utils/constants.js'



/**
* @query {依据name返回field对应的字段类型}
* @param {string} name fieldName
* @return {string} fieldType
* 黑盒，仅需更改 TEXT_FIELD_ARRAY、DATETIME_FIELD_ARRAY、NUMBER_FIELD_ARRAY
*/
export const getFieldTypeByName = (name) => {
    if (TEXT_FIELD_ARRAY.includes(name))
        return "Text"
    else if (DATETIME_FIELD_ARRAY.includes(name))
        return "DateTime"
    else if (NUMBER_FIELD_ARRAY.includes(name))
        return "Number"

    return "Text"
}

/**
* @common {给fieldIdObjectToWritten中所有id标记为-1的field创建字段，并返回其id}
* @param {object} fieldIdObjectToWritten 需要写入数据的字段 name-id 集合
* @param {object} table 表格实例
* @param {object} t 国际化函数实例
* 黑盒，仅需更改 BASE_I18N_FIELD_PATH
*/
export const createFields = async (fieldIdObjectToWritten, table, t) => {
    const oldFieldIdObjectToWritten = JSON.parse(JSON.stringify(fieldIdObjectToWritten))
    const newFieldIdObjectToWritten = { ...oldFieldIdObjectToWritten }

    for (let key in oldFieldIdObjectToWritten) {
        if (oldFieldIdObjectToWritten[key] == -1) {
            const name = t(`${BASE_I18N_FIELD_PATH}.${key}`)
            const type = getFieldTypeByName(key)

            newFieldIdObjectToWritten[key] = await table.addField({
                type: FieldType[type],
                name,
            })
        }
    }

    return newFieldIdObjectToWritten
}


/**
* @query {获取要写入数据的字段的 name-id 对象，若需创建，则id值设置为-1}
* @param {array} existedFieldMetaList 表格中已经存在的字段元数据列表
* @param {array} fieldNameListToBeWritten 需要写入数据的字段名称列表
* @param {object} t 国际化函数实例
*/
export const getExistedFieldIdObjectToWritten = (existedFieldMetaList, fieldNameListToBeWritten, t) => {
    const existedFieldIdObject = {};

    for (let field of fieldNameListToBeWritten) {
        // 查找与fieldNameListToBeWritten相匹配的existedFieldMetaList项目

        let isError = false
        const type = getFieldTypeByName(field)


        const foundField = existedFieldMetaList.find(f => f.name === t(`${BASE_I18N_FIELD_PATH}.${field}`));

        if (NUMBER_FIELD_ARRAY.includes(field) && foundField && foundField.type !== 2) isError = true
        else if (TEXT_FIELD_ARRAY.includes(field) && foundField && foundField.type !== 1) isError = true
        else if (DATETIME_FIELD_ARRAY.includes(field) && foundField && foundField.type !== 5) isError = true

        if (isError) {
            const checkTip = `「${t(`${BASE_I18N_FIELD_PATH}.${field}`)}」${t(`${BASE_I18N_FIELD_TYPE_CHECK_PATH}.${type}`)}`
            return { errorMsg: checkTip, isError }
        }


        // 如果找到了相应的项目，就使用其id，否则设置为-1
        existedFieldIdObject[field] = foundField ? foundField.id : -1;
    }

    return { data: existedFieldIdObject, isError: false };
}


/**
 * @query {查询用户所勾选字段，对应的多维表格 fieldId}
 * @param {object} table 多维表格 SDK table 对象
 * @param {object} currentFields 当前表格的字段元信息
 * @param {array} targetFields 所勾选的目标字段
 * @return {object} simplyName-fieldId
 */
export const queryBaseTableFieldsIdTargeted = async (table, existedFieldMetaList, responseFieldsSelected, t) => {
    // 匹配已有的字段
    const existedFieldIdObjectToWritten = getExistedFieldIdObjectToWritten(existedFieldMetaList, responseFieldsSelected, t)

    if (existedFieldIdObjectToWritten.isError) // 错误处理，提示格式错误 
        return { isError: true, errorMsg: existedFieldIdObjectToWritten.errorMsg, errorType: "field-type-error" }


    // 创建缺少的字段
    let baseTableFieldsIdTargeted = await createFields(existedFieldIdObjectToWritten.data, table, t)

    return { isError: false, data: baseTableFieldsIdTargeted }
}

/**
 * @command {params}{更新请求参数}
 * @param {object} params 请求参数信息
 * @param {string} key 请求参数 Key
 * @param {string} value 请求参数 Value
 */
export const updateParams = (params, key, value) => {
    params[key] = value
}

/** 
 * @query(check) {检查参数是否为空}
 * @params {...args}
 * @return {object}
 */
export const checkIfEmpty = (...args) => {

    // 检查是否填写了必要的信息
    for (let i = 0; i < args.length; i++) {
        if (args[i] === null || args[i] === undefined || args[i] === "")
            return { isError: true, errorType: "empty_input", errorMsg: "" }
        else if (Array.isArray(args[i]) && args[i].length === 0)
            return { isError: true, errorType: "empty_response_fields_selected", errorMsg: "" }
    }

    return { isError: false }
}

/**
 * 将 IG 数据写回多维表格
 * @param {object} table SDK table 实例
 * @param {array} targetDataStructure 特定数据结构的列表，每个元素为  fieldId-value object
 */
export const addTableRecords = async (table, targetDataStructure) => {
    await table.addRecords(targetDataStructure);
}