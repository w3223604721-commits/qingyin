<template>
  <div>
    <div class="page-header">
      <h2>旅程信息维护</h2>
      <p class="text-gray-500 text-sm mt-1">查看和管理所有用户的旅程记录</p>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
      <el-form :inline="true" :model="filters" class="flex flex-wrap gap-3">
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="旅程名称搜索"
            clearable
            class="!w-56"
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <Search class="w-4 h-4 text-gray-400" />
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="分类">
          <el-select v-model="filters.categoryId" placeholder="全部分类" clearable class="!w-40">
            <el-option label="全部分类" value="" />
            <el-option
              v-for="cat in categoryOptions"
              :key="cat._id"
              :label="cat.icon + ' ' + cat.name"
              :value="cat._id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部状态" clearable class="!w-36">
            <el-option label="全部状态" value="" />
            <el-option label="进行中" value="active" />
            <el-option label="已归档" value="archived" />
            <el-option label="已删除" value="deleted" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <Search class="w-4 h-4 mr-1" /> 搜索
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100">
      <div class="p-5 border-b border-gray-100 flex items-center justify-between">
        <span class="text-sm text-gray-500">共 {{ total }} 条旅程记录</span>
      </div>

      <el-table :data="journeys" style="width: 100%" v-loading="loading" empty-text="暂无旅程数据">
        <el-table-column label="序号" width="70" align="center">
          <template #default="{ $index }">
            {{ (pagination.page - 1) * pagination.pageSize + $index + 1 }}
          </template>
        </el-table-column>
        <el-table-column prop="name" label="旅程名称" min-width="180" show-overflow-tooltip />
        <el-table-column label="所属用户" width="140" align="center">
          <template #default="{ row }">
            <el-tooltip :content="row.user_nickname || '未知用户'" placement="top">
              <div class="flex items-center gap-2">
                <el-avatar :size="28" :src="row.user_avatar">
                  {{ (row.user_nickname || '?')[0] }}
                </el-avatar>
                <span class="text-sm">{{ row.user_nickname || '-' }}</span>
              </div>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="目的地" min-width="160">
          <template #default="{ row }">
            <div class="flex items-center gap-1 text-sm">
              <MapPin class="w-3.5 h-3.5 text-gray-400" />
              {{ row.city || row.province || row.country || '-' }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="日期" width="180" align="center">
          <template #default="{ row }">
            <span class="text-sm">
              {{ formatDate(row.start_date) }} ~ {{ formatDate(row.end_date) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="标签" min-width="160">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-1">
              <el-tag
                v-if="row.category_name"
                :color="row.category_color"
                effect="light"
                size="small"
                round
              >
                {{ row.category_icon }} {{ row.category_name }}
              </el-tag>
              <el-tag
                v-for="tag in (row.tags || [])"
                :key="tag"
                size="small"
                type="info"
                round
              >
                {{ tag }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'active'" type="success" size="small">进行中</el-tag>
            <el-tag v-else-if="row.status === 'archived'" type="warning" size="small">已归档</el-tag>
            <el-tag v-else type="danger" size="small">已删除</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="120" align="center">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="openEditDialog(row)">
              <Pencil class="w-3.5 h-3.5 mr-0.5" /> 编辑
            </el-button>
            <el-button
              v-if="row.status === 'active'"
              type="warning"
              text
              size="small"
              @click="handleStatusChange(row._id, 'archived')"
            >
              <Archive class="w-3.5 h-3.5 mr-0.5" /> 归档
            </el-button>
            <el-button
              v-if="row.status === 'archived'"
              type="success"
              text
              size="small"
              @click="handleStatusChange(row._id, 'active')"
            >
              <RotateCcw class="w-3.5 h-3.5 mr-0.5" /> 恢复
            </el-button>
            <el-button
              v-if="row.status === 'deleted'"
              type="success"
              text
              size="small"
              @click="handleStatusChange(row._id, 'active')"
            >
              <RotateCcw class="w-3.5 h-3.5 mr-0.5" /> 恢复
            </el-button>
            <el-button
              v-if="row.status !== 'deleted'"
              type="danger"
              text
              size="small"
              @click="handleStatusChange(row._id, 'deleted')"
            >
              <Trash2 class="w-3.5 h-3.5 mr-0.5" /> 删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="p-5 flex justify-center">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </div>

    <!-- Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      title="编辑旅程"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="editForm" :rules="editRules" label-position="top">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="旅程名称" prop="name">
              <el-input v-model="editForm.name" placeholder="旅程名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类" prop="category_id">
              <el-select v-model="editForm.category_id" placeholder="选择分类" clearable class="w-full">
                <el-option label="无分类" value="" />
                <el-option
                  v-for="cat in categoryOptions"
                  :key="cat._id"
                  :label="cat.icon + ' ' + cat.name"
                  :value="cat._id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="城市" prop="city">
              <el-input v-model="editForm.city" placeholder="城市" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="省份" prop="province">
              <el-input v-model="editForm.province" placeholder="省份" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="国家" prop="country">
              <el-input v-model="editForm.country" placeholder="国家" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="开始日期" prop="start_date">
              <el-date-picker v-model="editForm.start_date" type="date" placeholder="开始日期" class="w-full" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束日期" prop="end_date">
              <el-date-picker v-model="editForm.end_date" type="date" placeholder="结束日期" class="w-full" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
            placeholder="旅程描述"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="标签">
          <el-select
            v-model="editForm.tags"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入标签并按回车添加"
            class="w-full"
          >
            <el-option
              v-for="tag in presetTags"
              :key="tag"
              :label="tag"
              :value="tag"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleEditSubmit">
          保存修改
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { callFunction } from '@/api/cloudbase'
import { Search, Pencil, Trash2, Archive, RotateCcw, MapPin } from 'lucide-vue-next'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'

interface Journey {
  _id: string
  name: string
  user_nickname: string
  user_avatar: string
  city: string
  province: string
  country: string
  start_date: string
  end_date: string
  description: string
  tags: string[]
  category_id: string
  category_name: string
  category_icon: string
  category_color: string
  status: string
  created_at: string
}

interface CategoryOption {
  _id: string
  name: string
  icon: string
}

const journeys = ref<Journey[]>([])
const total = ref(0)
const loading = ref(false)
const dialogVisible = ref(false)
const editingId = ref('')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const categoryOptions = ref<CategoryOption[]>([])

const presetTags = ['旅行', '自然', '美食', '城市', '文化', '海边', '雪山', '自驾', '徒步', '摄影']

const filters = reactive({
  keyword: '',
  categoryId: '',
  status: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
})

const editForm = reactive({
  name: '',
  city: '',
  province: '',
  country: '中国',
  start_date: '',
  end_date: '',
  description: '',
  tags: [] as string[],
  category_id: '',
})

const editRules: FormRules = {
  name: [{ required: true, message: '请输入旅程名称', trigger: 'blur' }],
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

async function fetchCategories() {
  try {
    const data = await callFunction('admin-categories', { action: 'list' })
    categoryOptions.value = data?.list || []
  } catch (e) {
    console.error('获取分类选项失败:', e)
  }
}

async function fetchJourneys() {
  loading.value = true
  try {
    const data = await callFunction('admin-journeys', {
      action: 'list',
      keyword: filters.keyword,
      categoryId: filters.categoryId,
      status: filters.status,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    journeys.value = data?.list || []
    total.value = data?.total || 0
  } catch (e) {
    console.error('获取旅程列表失败:', e)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchJourneys()
}

function handleReset() {
  filters.keyword = ''
  filters.categoryId = ''
  filters.status = ''
  pagination.page = 1
  fetchJourneys()
}

function openEditDialog(row: Journey) {
  editingId.value = row._id
  editForm.name = row.name
  editForm.city = row.city || ''
  editForm.province = row.province || ''
  editForm.country = row.country || '中国'
  editForm.start_date = row.start_date || ''
  editForm.end_date = row.end_date || ''
  editForm.description = row.description || ''
  editForm.tags = row.tags || []
  editForm.category_id = row.category_id || ''
  dialogVisible.value = true
}

async function handleEditSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await callFunction('admin-journeys', {
      action: 'update',
      id: editingId.value,
      ...editForm,
    })
    ElMessage.success('旅程信息更新成功')
    dialogVisible.value = false
    fetchJourneys()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '更新失败'
    ElMessage.error(msg)
  } finally {
    submitting.value = false
  }
}

async function handleStatusChange(id: string, status: string) {
  const labelMap: Record<string, string> = {
    active: '恢复',
    archived: '归档',
    deleted: '删除',
  }
  try {
    await callFunction('admin-journeys', {
      action: 'updateStatus',
      id,
      status,
    })
    ElMessage.success(`旅程已${labelMap[status]}`)
    fetchJourneys()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '操作失败'
    ElMessage.error(msg)
  }
}

onMounted(() => {
  fetchCategories()
  fetchJourneys()
})
</script>
