import { bitable, FieldType } from '@lark-base-open/js-sdk';


/**
 * @query {获取 SDK table、view、existedFieldMetaList 等信息}
 * @return {object} table, view, existedFieldMetaList
 */
export const queryBaseTableAndView = async (tableId) => {
    const table = await bitable.base.getTableById(tableId)
    const existedFieldMetaList = await table.getFieldMetaList();

    return { table, existedFieldMetaList }
}

/**
 * 异步获取基础表格元数据列表。
 * 
 * 该函数通过调用 bitable.base.getTableMetaList 方法，异步获取当前项目中所有基础表格的元数据列表。
 * 元数据列表包含各个表格的结构信息，如字段名、字段类型等，可用于表格数据的操作和管理。
 * 
 * @returns {Promise<Array>} 返回一个 Promise，解析为包含表格元数据的数组。
 */
export const queryBaseTableMetaList = async () => {
    // 异步获取表格元数据列表
    const tableMetaList = await bitable.base.getTableMetaList()

    // 返回获取到的表格元数据列表
    return tableMetaList
}


/**
 * 根据表ID和字段类型异步查询表和字段元数据列表。
 * 
 * 本函数通过提供的表ID，查询并返回指定表的详细信息以及特定类型字段的元数据列表。
 * 这对于需要了解表结构和字段属性的场景非常有用，比如在前端展示表字段信息或进行数据验证时。
 * 
 * @param {string} tableId - 表的唯一标识ID。
 * @param {string} fieldType - 字段的类型，用于查询特定类型的字段元数据。
 * @returns {Object} 返回一个对象，包含表信息和字段元数据列表。
 */
export const queryTableAndFieldMetaTypeList = async (tableId, fieldType) => {
    // 根据表ID获取表对象
    const table = await bitable.base.getTableById(tableId)
    // 根据字段类型获取该类型的所有字段元数据列表
    const fieldMetaListByType = await table.getFieldMetaListByType(FieldType[fieldType])
    console.log( fieldMetaListByType)
    // 返回包含表信息和字段元数据的对象
    return { table, fieldMetaListByType }
}

/**
 * 异步查询指定表的记录列表。
 * 
 * 本函数通过异步方式获取指定数据表中的所有记录列表。使用了async/await语法糖，以确保在获取记录列表的过程中不会阻塞其他代码的执行。
 * 这种方式适用于处理需要等待I/O操作（如数据库查询）完成的情况，能够提高应用的响应性和性能。
 * 
 * @param {Object} table - 数据表对象。这个对象应该提供了getRecordList方法，用于获取表中的记录列表。
 * @returns {Array} 返回一个包含记录的数组。每个记录都是表中的一行数据。
 */
export const queryRecordIdList = async (tableId) => {
    // 根据表ID获取表对象
    const table = await bitable.base.getTableById(tableId)
    // 等待数据表的记录列表被获取。
    const recordIdList = await table.getRecordIdList ();  // getVisibleRecordIdList 
    
    // 返回获取到的记录列表。
    return recordIdList;
}

export const queryFieldById = async (tableId, fieldId) => {
    // 根据表ID获取表对象
    const table = await bitable.base.getTableById(tableId)
    // 
    const field = await table.getFieldById(fieldId);
    return field
}