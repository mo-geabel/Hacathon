# Test Student Accounts

The database has been populated with four distinct student profiles to properly test the AI Filtering automation.

All accounts use the same password: **`student123`**

---

### 1. The Perfect Student
* **Name:** Ahmet Yılmaz
* **Email:** `ahmet.yilmaz@ogr.sau.edu.tr`
* **GPA:** `3.95`
* **Event Rating:** `4.8`
* **Ghosted Events:** `0`
* *Expected AI Behavior:* Should receive a near-perfect score (95+) and be highly recommended for approval.

### 2. The Rising Star
* **Name:** Zeynep Çelik
* **Email:** `zeynep.celik@ogr.sau.edu.tr`
* **GPA:** `3.50`
* **Event Rating:** `4.5`
* **Ghosted Events:** `0`
* *Expected AI Behavior:* Should receive a very strong score (85-95) and a solid recommendation.

### 3. The Average Student
* **Name:** Ayşe Kaya
* **Email:** `ayse.kaya@ogr.sau.edu.tr`
* **GPA:** `2.80`
* **Event Rating:** `3.5`
* **Ghosted Events:** `1`
* *Expected AI Behavior:* Should receive a mediocre score (50-70) and a neutral recommendation.

### 4. The Ghoster (Unreliable)
* **Name:** Mehmet Demir
* **Email:** `mehmet.demir@ogr.sau.edu.tr`
* **GPA:** `1.90`
* **Event Rating:** `2.1`
* **Ghosted Events:** `5`
* *Expected AI Behavior:* Should receive a terrible score (< 30) with a warning recommendation due to severe unreliability.
