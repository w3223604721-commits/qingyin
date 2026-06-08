<template>
  <div>
    <div class="page-header flex items-center justify-between">
      <div>
        <h2>日志分类管理</h2>
        <p class="text-gray-500 text-sm mt-1">管理旅程的预定义分类标签</p>
      </div>
      <el-button type="primary" size="large" @click="openCreateDialog">
        <Plus class="w-4 h-4 mr-1" /> 新增分类
      </el-button>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100">
      <div class="p-5 border-b border-gray-100 flex items-center justify-between">
        <span class="text-sm text-gray-500">共 {{ total }} 个分类</span>
      </div>

      <el-table :data="categories" style="width: 100%" v-loading="loading" empty-text="暂无分类数据">
        <el-table-column prop="sort_order" label="序号" width="80" align="center" />
        <el-table-column prop="name" label="分类名称" min-width="160">
          <template #default="{ row }">
            <el-tag :color="row.color" effect="light" round size="large">
              {{ row.icon }} {{ row.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="icon" label="图标" width="80" align="center" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="创建时间" width="180" align="center">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="openEditDialog(row)">
              <Pencil class="w-3.5 h-3.5 mr-0.5" /> 编辑
            </el-button>
            <el-popconfirm
              title="确定删除此分类？如果有关联旅程，分类将被清空。"
              confirm-button-text="确认删除"
              cancel-button-text="取消"
              @confirm="handleDelete(row._id)"
            >
              <template #reference>
                <el-button type="danger" text size="small">
                  <Trash2 class="w-3.5 h-3.5 mr-0.5" /> 删除
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑分类' : '新增分类'"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：自然风光" maxlength="20" show-word-limit />
        </el-form-item>

        <el-form-item label="图标" prop="icon">
          <el-input v-model="form.icon" placeholder="例如：🏔️" maxlength="4" class="!w-32" />
          <div class="text-xs text-gray-400 mt-1">可使用 Emoji 作为分类图标</div>
        </el-form-item>

        <el-form-item label="排序序号" prop="sort_order">
          <el-input-number v-model="form.sort_order" :min="0" :max="999" />
        </el-form-item>

        <el-form-item label="颜色" prop="color">
          <el-color-picker v-model="form.color" show-alpha />
          <span class="text-xs text-gray-400 ml-2">用于标签显示颜色</span>
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="分类描述（选填）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEditing ? '保存修改' : '确认新增' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { callFunction } from '@/api/cloudbase'
import { Plus, Pencil, Trash2 } from 'lucide-vue-next'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'

interface Category {
  _id: string
  name: string
  icon: string
  color: string
  sort_order: number
  description: string
  created_at: string
}

const categories = ref<Category[]>([])
const total = ref(0)
const loading = ref(false)
const dialogVisible = ref(false)
const isEditing = ref(false)
const editingId = ref('')
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  name: '',
  icon: '🏷️',
  sort_order: 0,
  color: '#409EFF',
  description: '',
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { min: 2, max: 20, message: '2-20 个字符', trigger: 'blur' },
  ],
  icon: [
    { required: true, message: '请输入图标', trigger: 'blur' },
  ],
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

async function fetchCategories() {
  loading.value = true
  try {
    const data = await callFunction('admin-categories', { action: 'list' })
    categories.value = data?.list || []
    total.value = data?.total || 0
  } catch (e) {
    console.error('获取分类列表失败:', e)
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  isEditing.value = false
  editingId.value = ''
  form.name = ''
  form.icon = '🏷️'
  form.sort_order = 0
  form.color = '#409EFF'
  form.description = ''
  dialogVisible.value = true
}

function openEditDialog(row: Category) {
  isEditing.value = true
  editingId.value = row._id
  form.name = row.name
  form.icon = row.icon
  form.sort_order = row.sort_order
  form.color = row.color || '#409EFF'
  form.description = row.description || ''
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (isEditing.value) {
      await callFunction('admin-categories', {
        action: 'update',
        id: editingId.value,
        ...form,
      })
      ElMessage.success('分类更新成功')
    } else {
      await callFunction('admin-categories', {
        action: 'create',
        ...form,
      })
      ElMessage.success('分类创建成功')
    }
    dialogVisible.value = false
    fetchCategories()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '操作失败'
    ElMessage.error(msg)
  } finally {
    submitting.value = false
  }
}

async function handleDelete(id: string) {
  try {
    await callFunction('admin-categories', { action: 'delete', id })
    ElMessage.success('分类已删除')
    fetchCategories()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '删除失败'
    ElMessage.error(msg)
  }
}

onMounted(() => {
  fetchCategories()
})
</script>
