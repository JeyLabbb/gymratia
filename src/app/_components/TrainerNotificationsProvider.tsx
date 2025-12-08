'use client'

import { useTrainerNotifications } from './useTrainerNotifications'
import { useToast, ToastContainer } from './Toast'
import { TrainerNotificationPopup } from './TrainerNotificationPopup'

export function TrainerNotificationsProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast()
  const { notifications, removeNotification } = useTrainerNotifications()
  
  return (
    <>
      {children}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      {notifications.map((notification) => (
        <TrainerNotificationPopup
          key={notification.id}
          trainerSlug={notification.trainerSlug}
          message={notification.message}
          onClose={() => removeNotification(notification.id)}
          onOpen={() => removeNotification(notification.id)}
        />
      ))}
    </>
  )
}

