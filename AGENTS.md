# Quy định & Hướng dẫn dự án (Macro Liquidity & Banking Rules)

## 1. Bảng NHNN (Ngân hàng Nhà nước)
- **Cột Hành động NHNN**: 
  - Nếu `key = Hỗ trợ thanh khoản` thì hiển thị màu xanh, trên flow sẽ có mũi tên bơm từ bồn NHNN sang bồn thanh khoản NHTM.

- **Cấu trúc Bồn Mẹ (Bồn TD NHNN)**:
  - Bóc tách dựa trên Bảng cân đối kế toán tài sản của Ngân hàng Trung ương.
  - `Tổng quy mô Bồn Mẹ = Giá trị Dự trữ USD (quy đổi) + Tài sản nội tệ (VND) của NHNN`
  - `Giá trị Dự trữ USD (quy đổi) = Dự trữ ngoại hối (USD) × Tỷ giá trung tâm`
  - `Tài sản nội tệ (VND) của NHNN` = Cơ sở tiền tệ (Money Base - $M_0$), gồm:
    1. Tiền mặt trong lưu thông: giấy bạc trong dân, ví DN, cây ATM, két NHTM.
    2. Tiền gửi của các NHTM tại NHNN: dự trữ bắt buộc và tiền gửi thanh khoản dư thừa.
  - **Nguồn số liệu**: Website NHNN (`sbv.gov.vn`) mục Thống kê tiền tệ (bảng Cơ sở tiền tệ $M_0$), Dự trữ ngoại hối (USD) từ công bố NHNN hoặc ước tính IMF/World Bank/SSI/HSC.
  - **Công thức tính % tỷ trọng**:
    - `% Tỷ trọng USD tại Bồn Mẹ = (Giá trị USD (quy đổi) / Tổng quy mô Bồn Mẹ) × 100`
    - `% Tỷ trọng VND tại Bồn Mẹ = (M0 / Tổng quy mô Bồn Mẹ) × 100`
  - **Ý nghĩa mô hình 2D**: Khi Tỷ giá chuyển sang Vùng Đỏ, NHNN xả USD ra khỏi bồn mẹ → tỷ trọng USD sụt giảm, đồng thời NHNN thu về lượng lớn VND và khóa lại trong kho → lượng $M_0$ lưu thông sụt giảm nghiêm trọng → Mực nước ở Bồn Con (NHTM) bị tụt theo, đẩy lãi suất liên ngân hàng lên cao.

## 2. Flow Tỷ trọng USD và VND
- **Bước 1**: `Giá trị USD (quy đổi) = Dự trữ ngoại hối (USD) × Tỷ giá trung tâm`
- **Bước 2**: `Tổng quy mô = Giá trị USD (quy đổi) + Thanh khoản VND (Mực nước hệ thống)`
- **Bước 3**: 
  - `% Tỷ trọng USD = (Giá trị USD (quy đổi) / Tổng quy mô) × 100`
  - `% Tỷ trọng VND = 100% - % Tỷ trọng USD`

## 3. Bồn Thanh khoản NHTM
- **Mối quan hệ tỷ lệ nghịch**:
  - LS LNH Thấp: tiền dư thừa → Mực nước bồn Thanh khoản dâng cao (Dồi dào - Tiền rẻ).
  - LS LNH Cao: thiếu hụt tiền mặt → Mực nước bồn Thanh khoản hạ thấp (Căng thẳng - Tiền đắt).
- **Công thức Mực nước (%)**: `Mức nước (%) = 120 - 20 × LS LNH (%)`
  - LS LNH 1%: Mức nước = 100% (Bồn đầy - Tiền rẻ)
  - LS LNH 3%: Mức nước = 60% (Bồn trung bình)
  - LS LNH 5%: Mức nước = 20% (Bồn cạn - Tiền đắt)
- **Logic màu nước**:
  - Dồi dào (`LS < 2%`): Màu Xanh lam (Blue)
  - Ổn định (`LS 2% - 4%`): Màu Hổ phách/Vàng (Amber)
  - Căng thẳng (`LS > 4%`): Màu Đỏ hồng (Rose)
- **Vạch chỉ số áp lực (Đường kẻ đứt màu đen)**:
  - Chạy ngang bồn NHTM thể hiện giá trị LS LNH hiện tại. Lãi suất càng thấp thì vạch càng thấp và mực nước màu xanh lam càng cao.
- **Parsing**: Hỗ trợ định dạng phần trăm dấu chấm `.` và dấu phẩy `,` (ví dụ `1.5%` hoặc `1,5%`).

## 4. Bồn Tín dụng Chứng khoán (Bồn TD CK)
- **Phân loại & Màu sắc**:
  - Tràn (rủi ro): `Margin ≥ 110%` (Màu Rose)
  - Đầy: `Margin 90% - 110%` (Màu Amber)
  - Gần đầy: `Margin 80% - 90%` (Màu Vàng)
  - Nửa bồn: `Margin 40% - 80%` (Màu Xanh dương)
  - Đang bơm: `Margin 20% - 40%` (Màu Xanh lục)
  - Cạn: `Margin < 20%` (Màu Xám)
  - Đang rút: Tự động gán nhãn nếu Margin giảm so với quý liền trước (Màu Rose).

## 5. Bảng TTCK-VN
- **Cột Trạng thái Thị trường**:
  - Khi LS liên NH và LS huy động tăng: Trạng thái `Phân hoá` (`key = Phân hoá`), các nhóm cổ phiếu nhà nước, cổ phiếu giá trị, cổ phiếu có câu chuyện riêng hưởng lợi.
  - Khi LS thấp và margin tăng: Trạng thái `Lan toả` (`key = Lan toả`), các nhóm cổ phiếu hưởng lợi từ tín dụng sẽ hưởng lợi hơn.
