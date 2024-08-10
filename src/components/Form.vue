<template>
  <!-- TITLE  -->
  <div style="width: 100%;padding-left: 10px;border-left: 5px solid #2598f8;margin-bottom: 20px;padding-top: 5px;">{{ $t('title') }}</div>
  <!-- DESCRIPTION  -->
  <el-alert  style="margin: 20px 0 0 0;color: #606266;" :title="$t('alerts.selectNumberField')" type="info" />
  <el-alert  style="margin: 10px 0 0 0;" :title="$t('alerts.error')" type="error" />
  <!-- DOCX -->
  <el-link style="color: #3e75f5;margin: 20px 0;" type="primary" :href="DESC_DOCX_URL"
  target="_blank">👉  {{ $t('labels.apiDocument') }}</el-link>

  
  <el-form style="color: #606266">
    <!-- INPUT-AREA  -->
    <el-form-item v-if="!(isProgressStarted && !isProgressEnded)" :label="$t('labels.headers')  " size="large" required>
      Cookie<el-input v-model="IG_COOKIE" :placeholder="$t('placeholder.cookie')" />
      X-Ig-App-ID<el-input v-model="IG_APP_ID" :placeholder="$t('placeholder.appId')" />
      X-Ig-Www-Claim<el-input v-model="IG_CLAIM" :placeholder="$t('placeholder.claim')" />

    </el-form-item>

    <el-form-item :label="$t('labels.params') " size="large" required>
      Username
      <el-select v-model="userTableId" :placeholder="$t('placeholder.userTableId')" style="width: 100%">
        <el-option v-for="meta in tableMetaList" :key="meta.id" :label="meta.name" :value="meta.id" />
      </el-select>
      <el-select v-if="userTableId" v-model="userFieldId" :placeholder="$t('placeholder.userFieldId')" style="width: 100%; margin-top: 10px;">
        <el-option v-for="meta in fieldMetaList" :key="meta.id" :label="meta.name" :value="meta.id" />
      </el-select>
      
      <!-- Hashtag<el-input v-model="targetHashTag" :placeholder="$t('placeholder.hashtag')" /> -->
    </el-form-item>

    <el-form-item :label="$t('labels.outputTable') " size="large" required>
      <el-select v-model="postTableId" :placeholder="$t('placeholder.outputTableId')" style="width: 100%">
        <el-option v-for="meta in tableMetaList" :key="meta.id" :label="meta.name" :value="meta.id" />
      </el-select>
    </el-form-item>


    <!-- CHECKBOX-AREA  -->
    <div class="map-fields-checklist">
      <el-checkbox v-model="isSelectAllFields" :indeterminate="isIndeterminateToMap" @change="handleselectAllFieldsChange">{{
        $t(`${BASE_I18N_FIELD_PATH}.selectAll`) }}</el-checkbox>
      <el-checkbox-group v-model="responseFieldsSelected" @change="handleresponseFieldsSelectedChange">
        <el-checkbox v-for="fieldToMap in responseFieldsAvaiable" :key="fieldToMap.label" :label="fieldToMap.label">
          {{ $t(`${BASE_I18N_FIELD_PATH}.${fieldToMap.label}`) }}
        </el-checkbox>
      </el-checkbox-group>
    </div>

    <!-- SUMBIT BUTTON  -->
    <el-button color="#3370ff" style="margin: 20px 0;"  type="primary" @click="handleIGRequest">{{ $t('sumbit')
    }}</el-button>    
  </el-form>

  <!-- DESCRIPTION  -->
  <div v-if="isProgressStarted" class="demo-progress" style="margin: 10px 0 20px 0;">
    <div style="font-size: 14px; margin-bottom: 4px;">{{ $t('infoTip.process') }}</div>
    <el-progress :percentage="progressPercentage" />
  </div>

  <el-alert v-if="isProgressEnded && isError"  :title="errorMsgFinal"  type="error" show-icon />
  <el-alert v-if="isProgressEnded" style="background-color: #e1eaff;color: #606266;margin-top: 20px;" :title="processResultDesc"  type="success" show-icon />
  


</template>

<script setup>
import { bitable } from '@lark-base-open/js-sdk';
import { useI18n } from 'vue-i18n';
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import { queryBaseTableFieldsIdTargeted, updateParams, checkIfEmpty, addTableRecords } from '../utils/helper';
import { queryBaseTableAndView, queryBaseTableMetaList, queryTableAndFieldMetaTypeList, queryRecordIdList, queryFieldById  } from "../utils/base"
import { DESC_DOCX_URL, BASE_I18N_FIELD_PATH, BASE_REQUEST_URL } from '../utils/constants';



// -- 配置区域
const { t } = useI18n();  // 国际化
const IG_HEADER_STRUCTURE = {
  "cookie": "cookie",
  "appId": "app_id",
  "claim": "claim",
  "maxId": "max_id"
}

const IG_PARAMS_STRUCTURE = {
  "hashtag": "hashtag",
  "username": "user"
}


// -- 核心数据区域
// --== 响应式
const IG_COOKIE = ref("")
const IG_APP_ID = ref("")
const IG_CLAIM = ref("")

const targetHashTag = ref("")
const targetUsername = ref("")
const userTableId = ref("")
const userFieldId = ref("")
const postTableId = ref("")

const tableMetaList = ref("")
const fieldMetaList = ref("")

const responseFieldsSelected = ref([
  "postLink", "videoViewCount", "likeCount", "username", "commentCount", "createTime", "requestTime", "text"
]) //  可以创建的字段


// --== 非响应式


// -- 辅助数据区域
const isProgressStarted = ref(false)
const isProgressEnded = ref(false)
const isError = ref(false)
const errorMsgFinal = ref("")
const progressPercentage = ref(1)
const processResultDesc = ref("")
const isSelectAllFields = ref(false)
const isIndeterminateToMap = ref(true)
const responseFieldsAvaiable = ref([
  {"label": "username"},
  {"label": "postLink"},
  {"label": "text"},
  {"label": "videoViewCount"},
  {"label": "likeCount"},
  {"label": "commentCount"},
  {"label": "videoLink"},
  {"label": "createTime"},
  {"label": "requestTime"}
  
])   
let postTotalNum = 0
let postNumFilteredHashtag = 0
let requestNextMaxId = ""
let uploaderNum = 0
let duration = 0

// -- 方法声明：函数式 & 查询式

/**
 * @main {插件运行主函数}
 */
const handleIGRequest = async () => {
  // 检查必选信息是否已填写
  const { userTableId, userFieldId, postTableId } = queryTableAndFieldSelect()

  const checkRes = await checkIfEmpty(IG_COOKIE.value, IG_APP_ID.value, IG_CLAIM.value, userTableId, userFieldId, postTableId)
  if (checkRes.isError) {
    await handleErrorTip(checkRes.errorMsg, checkRes.errorType)
    return
  }
    

  // 插件运行开始提示
  await showProcessTip("start")
  

  // 查询 Base SDK table、view 等实例，并获取当前表格的字段元信息
  const {table, existedFieldMetaList} = await queryBaseTableAndView(postTableId)
  
  // 查询 Instagram response fields selected
  const targetResponseFields = queryTargetResponseFields()
  // 查询 targetResponseFields 对应的多维表格字段Id，若无，则创建
  const baseTableFieldsIdTargetedRes = await queryBaseTableFieldsIdTargeted(table, existedFieldMetaList, targetResponseFields, t)
  if (baseTableFieldsIdTargetedRes.isError) {
    await handleErrorTip(baseTableFieldsIdTargetedRes.errorMsg, baseTableFieldsIdTargetedRes.errorType)
    return
  }
  const baseTableFieldsIdTargeted = baseTableFieldsIdTargetedRes.data
  console.log("baseTableFieldsIdTargeted", baseTableFieldsIdTargeted)
  console.log(1111)


  // 查询 Instagram Cookie 等请求头信息
  const headers = queryIGHeaderInput() 
  console.log(222)

  

  

  const startTime = Date.now()
  // FOR 标记：循环请求需要处理的用户，直到没有用户
  const recordListUserTable = await queryRecordIdList(userTableId)
  const userField = await queryFieldById(userTableId, userFieldId)


  for (let recordId of recordListUserTable) {
    const usernameValue = await userField.getValue(recordId)
    if (!usernameValue)
      continue

    uploaderNum ++
    const username = usernameValue[0].text
  // 查询 Instagram Hashtag 等请求参数信息
    const params = queryIGParamsInput(username)

    // WHILE 标记：循环请求 Instagram API，直到没有更多 Posts
    do {
      const res = await getDataAndUpdateTable(headers, params, table, baseTableFieldsIdTargeted, targetUsername.value)
      if (res.isError) {
        // Handle the error and end the function
        await handleErrorTip(res.errorMsg, "request-error")
        return
      }
      if (res.isEmpty === true)
        continue
    } while (requestNextMaxId)
    
  }
  const endTime = Date.now()
  duration = endTime - startTime
  // 插件运行结束提示
  await showProcessTip("end")
  
}

/**
 * 获取Instagram 用户 Posts 数据，并更新用户多维表格数据
 * @param {object} headers 请求头信息
 * @param {object} params 请求参数信息
 * @param {object} table 多维表格 Table 实例
 */
const getDataAndUpdateTable = async (headers, params, table, baseTableFieldsIdTargeted) => {
  // send API request
  const res = await queryIGUserPostsFilteredHashtag(headers, params)
  if (res.isError)  return { isError: true, errorMsg: res.errorMsg }
  else updateDataFromResponse(res, params)

  if (res.data.hashtag_length === 0) {
    return { isError: false, isEmpty: true }
  }
  // handle API response data to Target data structure or 
  const targetDataStructure = queryTargetDataStructure(res.data, baseTableFieldsIdTargeted, params)

  // Write the data back to the multidimensional table
  await addTableRecords(table, targetDataStructure)

  return { isError: false }
}

/**
 * @command {postTotalNum, postNumFilteredHashtag, requestNextMaxId, params} 
 * 依据接口返回信息，更新一些辅助信息
 * @param {object} res 后端接口返回数据
 * @param {object} params 请求参数信息
 */
const updateDataFromResponse = (res, params) => {
  postTotalNum += res.data.total_length
  postNumFilteredHashtag += res.data.hashtag_length
  requestNextMaxId = res.data.next_max_id
  updateParams(params, IG_HEADER_STRUCTURE["maxId"], res.data.next_max_id)
}


/**
 * @query(status) {插件运行状态通知}
 * @param {string} Tiptype 提示类型
 */
const showProcessTip = async (Tiptype) => {
  if (Tiptype === "start") {
    progressPercentage.value = 1
    isProgressStarted.value = true
    isProgressEnded.value = false

    const interval = setInterval(() => {
      // 随机增加进度，模拟加载过程
      progressPercentage.value += Math.floor(Math.random() * 5) 
      if (progressPercentage.value > 90) {
        clearInterval(interval);
      }
    }, 1000); // 每秒更新一次进度
    
    await bitable.ui.showToast({
      toastType: 'success',
      message: t('infoTip.start')
    })



  } else if (Tiptype === "end") {s
    let endInfo = t('infoTip.end_sentence')
    
    const minutes = Math.floor(duration / 60000);
    const seconds = Number((duration % 60000) / 1000);
    const formattedTime = ` ${minutes} min ${seconds} s`;

    const resDesc = endInfo.replace("time", formattedTime).replace("uploaderNum", uploaderNum).replace("postTotalNum", postTotalNum).replace("postNumFilteredHashtag", postNumFilteredHashtag)
    progressPercentage.value = 100
    processResultDesc.value = resDesc
    isProgressStarted.value = false
    isProgressEnded.value = true

    postTotalNum = 0
    postNumFilteredHashtag = 0
    requestNextMaxId = ""

    await bitable.ui.showToast({
      toastType: 'success',
      message: t('infoTip.end')
    })
  }
}





/** @query{返回 Instagram Cookie 等请求头信息}
 * @return{object}
 */
const queryIGHeaderInput = () => {

  localStorage.setItem('IG_COOKIE', IG_COOKIE.value)   // string 类型
  localStorage.setItem('IG_APP_ID', IG_APP_ID.value)   // string 类型
  localStorage.setItem('IG_CLAIM', IG_CLAIM.value)   // string 类型
  

  return {
    [IG_HEADER_STRUCTURE.cookie]: IG_COOKIE.value,
    [IG_HEADER_STRUCTURE.appId]: IG_APP_ID.value,
    [IG_HEADER_STRUCTURE.claim]: IG_CLAIM.value
  }
}


/** @query{查询 Instagram Hashtag 等请求参数信息}
 * @return{objecy}
 */
const queryIGParamsInput = (targetUsername) => {
  localStorage.setItem('targetHashTag', targetHashTag.value)   // string 类型
  localStorage.setItem('targetUsername', targetUsername)   // string 类型

  return {
    [IG_PARAMS_STRUCTURE.hashtag]: targetHashTag.value,
    [IG_PARAMS_STRUCTURE.username]: targetUsername
  }
}

/**
 * @query {查询用户选择的数据表和字段信息}
 * @return {object}
 */
const queryTableAndFieldSelect = () => {
  localStorage.setItem('userTableId', userTableId.value)   // string 类型
  localStorage.setItem('userFieldId', userFieldId.value)   // string 类型
  localStorage.setItem('postTableId', postTableId.value)   // string 类型


  return {
    userTableId: userTableId.value, 
    userFieldId: userFieldId.value,
    postTableId: postTableId.value
  }
}


/** @query {查询需要返回的 fields 数组}
 * @return {array}
 */
const queryTargetResponseFields = () => {
  // localStorage.setItem('responseFieldsSelected', JSON.stringify(responseFieldsSelected.value))  // object 类型
  // localStorage.setItem('isSelectAllFields', isSelectAllFields.value)   // string 类型

  return responseFieldsSelected.value
}


/** @query  {sendAPI} {查询 Instagram 用户特定 Hastag 下的全部帖子}
 * @param {object} headers IG 请求头信息
 * @param {object} params IG 请求参数信息
 * @return {object} 通过 isError 字段标记请求是否成功
 */
const queryIGUserPostsFilteredHashtag = async (headers, params) => {
  const headersCopy = JSON.parse(JSON.stringify(headers))
  const paramsCopy = JSON.parse(JSON.stringify(params))
  headersCopy[IG_HEADER_STRUCTURE.cookie] = headersCopy[IG_HEADER_STRUCTURE.cookie].replaceAll('"', '\\"')
  
  const requestData = {...headersCopy, ...paramsCopy}

  // 发送POST请求
  try {
      const response = await axios.post(`${BASE_REQUEST_URL}/get_user_total_posts`, requestData);
      console.log('Response:', response.data);
      return { data: response.data, isError: false };
  } catch (error) {
      console.error('Error:', error);
      if (error?.response?.data?.error)
        return { errorMsg: error.response.data.error, isError: true };
      else
        return { errorMsg: error.message, isError: true };
  }
}

/**
 * @query(hanlde) {报错提示函数}
 * @param {string} errorMsg 错误提示
 * @param {string} errorType 错误类型
 */
const handleErrorTip = async (errorMsg, errorType) => {
  if (errorType === "request-error" || errorType === "field-type-error") {
    await bitable.ui.showToast({
      toastType: 'error',
      message: errorMsg
    })
  }

  else {
    await bitable.ui.showToast({
      toastType: 'error',
      message: t(`errorTip.${errorType}`)
    })
  }
  isError.value = true
  errorMsgFinal.value = errorMsg
  await showProcessTip("end")
}

/**
 * @query {获取格式化的 fieldId-value 数据}
 * @param {object} response 接口返回的 IG 数据
 * @param {object} baseTableFieldsIdTargeted simplyName-fieldId
 * @return {array} 格式化的 fieldId-value 数据
 */
const queryTargetDataStructure = (response, baseTableFieldsIdTargeted, params) => {
  const data = JSON.parse(JSON.stringify(response.res))
  const fieldIdObj = JSON.parse(JSON.stringify(baseTableFieldsIdTargeted))
  const mapRelationship = {
    "postLink": "code",
    "videoViewCount": "video_view_count",
    "likeCount": "like_count",
    "commentCount": "comment_count",
    "createTime": "created_at",
    "text": "text",
    "videoLink": "video",
  }
  let list = []

  for (let i = 0; i < data.length; i++) {
    let obj = {}
    for (let key in fieldIdObj) {
      if (key === "requestTime") {
        const now = new Date();
        obj[fieldIdObj[key]] = now.getTime();
        continue
      }

      let value = data[i][mapRelationship[key]]

      if (key === "postLink") 
        value = "https://www.instagram.com/p/" + value
      else if (key === "createTime")
        value = value*1000
      else if (key === "username")
        value = params[IG_PARAMS_STRUCTURE.username]
      


      obj[fieldIdObj[key]] = value
    }
    
    list.push({fields: obj})
  }

  return list
}



/**
 * @common(set) {读取缓存，并赋值给相关变量}
 */
const setVariableFromLocalStorage = () => {

  if (localStorage.getItem('IG_COOKIE') !== null) {  // string 类型
    IG_COOKIE.value = localStorage.getItem('IG_COOKIE')
  }
  if (localStorage.getItem('IG_APP_ID') !== null) {  // string 类型
    IG_APP_ID.value = localStorage.getItem('IG_APP_ID')
  }
  if (localStorage.getItem('IG_CLAIM') !== null) {  // string 类型
    IG_CLAIM.value = localStorage.getItem('IG_CLAIM')
  }
  

  if (localStorage.getItem('targetHashTag') !== null) {  // string 类型
    targetHashTag.value = localStorage.getItem('targetHashTag')
  }

  if (localStorage.getItem('userTableId') !== null) {  // string 类型
    userTableId.value = localStorage.getItem('userTableId')
  }

  if (localStorage.getItem('userFieldId') !== null) {  // string 类型
    userFieldId.value = localStorage.getItem('userFieldId')
  }

  if (localStorage.getItem('postTableId') !== null) {  // string 类型
    postTableId.value = localStorage.getItem('postTableId')
  }

}


/**
 * @common(handle) {处理 checkbox 全选点击事件}
 * @param {boolean} val checkbox 是否全选
 */
const handleselectAllFieldsChange = (val) => {
  const data = JSON.parse(JSON.stringify(responseFieldsAvaiable.value))
  if (val) {
    for (const item of data)
      responseFieldsSelected.value.push(item.label);
  } else {
    responseFieldsSelected.value = []
  }
  isIndeterminateToMap.value = false
}

/**
 * @common(handle) {处理 checkbox 点击事件}
 * @param {array} value 
 */
const handleresponseFieldsSelectedChange = (value) => {
  const checkedCount = value.length
  isSelectAllFields.value = checkedCount === responseFieldsAvaiable.value.length
  isIndeterminateToMap.value = checkedCount > 0 && checkedCount < responseFieldsAvaiable.value.length
  console.log('responseFieldsSelected:', responseFieldsSelected.value)

}

watch(userTableId, async (newValue, oldValue) => {
  if (newValue !== oldValue && newValue) {
    const { table, fieldMetaListByType } = await queryTableAndFieldMetaTypeList(userTableId.value, "Text")
    fieldMetaList.value = fieldMetaListByType
  }
})

onMounted(async () => {
  // 初始化勾选字段
  console.log("onMounted >> 已选中的返回字段数组", responseFieldsSelected.value)

  tableMetaList.value =  await queryBaseTableMetaList()
  

  // 读取缓存数据，并赋值给变量
  setVariableFromLocalStorage()


});
    
</script>



<style scoped>

.el-icon svg {
  color: #3370ff !important;
}

</style>
