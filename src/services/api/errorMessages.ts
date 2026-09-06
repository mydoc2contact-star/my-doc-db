const API_ERRORS: Record<string, string> = {
  'Cannot mark attendance before the appointment time':
    'لم يحن وقت الموعد بعد. يمكنك تسجيل حضر/غائب قبل الموعد بـ 10 دقائق فقط.',
  'Attendance has already been recorded': 'تم تسجيل حالة هذا المريض مسبقاً.',
  'Attendance can only be marked for confirmed appointments':
    'لا يمكن تسجيل الحضور إلا لمواعيد قائمة أو مؤكدة.',
  'Attendance cannot be marked for private appointments':
    'لا يمكن تسجيل الحضور للمواعيد الخاصة.',
  'Patient name is required for private appointments': 'اسم المريض مطلوب للموعد الخاص.',
  'Patient name or patientId is required': 'أدخل اسم المريض أو اختره من قائمة المرضى.',
  'يوجد موعد خاص آخر يتداخل مع هذا الوقت': 'يوجد موعد خاص آخر يتداخل مع هذا الوقت.',
  'يوجد موعد محجوز لمريض في هذه الفترة الزمنية': 'يوجد موعد محجوز لمريض في هذه الفترة الزمنية.',
  'ليس لديك صلاحية للوصول إلى المواعيد الخاصة': 'ليست لديك صلاحية للوصول إلى المواعيد الخاصة.',
  'وقت النهاية يجب أن يكون بعد وقت البداية': 'وقت النهاية يجب أن يكون بعد وقت البداية.',
  'Patient not found': 'المريض غير موجود.',
  'Appointment not found': 'الموعد غير موجود.',
  'Cannot cancel this appointment': 'لا يمكن إلغاء هذا الموعد.',
  'Failed to cancel appointment': 'تعذر إلغاء الموعد.',
  'Failed to delete appointment': 'تعذر حذف الموعد.',
  'Appointment deleted': 'تم حذف الموعد.',
  'Appointment is not pending': 'هذا الموعد ليس بانتظار التأكيد.',
  'Doctor account is not active': 'حساب الطبيب غير مفعّل.',
  'Doctor not available': 'الطبيب غير متاح.',
  'Authentication required': 'يجب تسجيل الدخول أولاً.',
  'Session expired': 'انتهت الجلسة. سجّل الدخول مرة أخرى.',
  'Invalid credentials': 'البريد أو كلمة المرور غير صحيحة.',
  'Invalid or expired token': 'انتهت صلاحية الجلسة. سجّل الدخول مرة أخرى.',
  'No appointments in queue for today': 'لا توجد مواعيد في طابور اليوم.',
  'Reception is already active': 'الاستقبال يعمل بالفعل.',
  'Today queue is already completed': 'تم إنهاء طابور اليوم.',
  'Reception is not active': 'الاستقبال غير مفعّل. ابدأ الاستقبال أولاً.',
  'No weekly schedule configured': 'لم يُضبط الجدول الأسبوعي بعد.',
  'Date is outside the weekly schedule': 'هذا التاريخ خارج الجدول الأسبوعي.',
  'Cannot generate slots in the past for this date': 'لا يمكن إنشاء مواعيد في وقت مضى.',
  'No slots could be generated with the provided settings':
    'تعذر إنشاء فترات بهذه الإعدادات. راجع الوقت والفاصل وفترة الراحة.',
  'Slot already exists': 'هذه الفترة موجودة مسبقاً.',
  'Selected time slot is not available': 'هذا الوقت محجوز بالفعل. اختر وقتاً آخر.',
  'Validation failed': 'البيانات المدخلة غير صحيحة. تأكد من الاسم والتاريخ والوقت.',
  'Forbidden': 'ليست لديك صلاحية لهذا الإجراء.',
  'Route not found': 'المسار غير موجود.',
}

export function translateApiMessage(message: string): string {
  return API_ERRORS[message] ?? message
}
