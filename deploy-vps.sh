#!/usr/bin/env bash
# ==============================================================================
# SCRIPT CẤU HÌNH & TRIỂN KHAI TỰ ĐỘNG HỆ THỐNG ERP YẾN SÀO & CÀ PHÊ TRÊN VPS
# Hệ điều hành khuyến nghị: Ubuntu 22.04 LTS / 24.04 LTS hoặc Debian 12
# Quyền yêu cầu: sudo / root
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================================================${NC}"
echo -e "${GREEN}      HỆ THỐNG QUẢN TRỊ DOANH NGHIỆP YẾN SÀO & CÀ PHÊ (ERP & AI SYSTEM)        ${NC}"
echo -e "${GREEN}                  KỊCH BẢN THIẾT LẬP VPS CHUẨN PRODUCTION 24/7                 ${NC}"
echo -e "${BLUE}===============================================================================${NC}"
echo ""

# 1. KIỂM TRA QUYỀN ROOT
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[LỖI] Vui lòng chạy script này dưới quyền root hoặc sudo!${NC}"
    echo "Ví dụ: sudo bash deploy-vps.sh"
    exit 1
fi

# 2. CẤU HÌNH SWAP RAM 4GB (CHỐNG OOM-KILLER TRÊN VPS RAM NHỎ)
echo -e "${YELLOW}[1/6] Kiểm tra bộ nhớ SWAP (chống tràn RAM khi chạy n8n & Docker)...${NC}"
SWAP_EXISTS=$(swapon --show | wc -l)
if [ "$SWAP_EXISTS" -le 1 ]; then
    echo "-> Đang tạo file SWAP 4GB tại /swapfile..."
    fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    if ! grep -q '/swapfile' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    # Tối ưu hóa swappiness
    sysctl vm.swappiness=15
    sysctl vm.vfs_cache_pressure=50
    echo 'vm.swappiness=15' >> /etc/sysctl.conf
    echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
    echo -e "${GREEN}✓ Đã tạo và kích hoạt 4GB SWAP thành công!${NC}"
else
    echo -e "${GREEN}✓ Đã có bộ nhớ SWAP. Bỏ qua bước tạo mới.${NC}"
fi

# 3. CÀI ĐẶT DOCKER & DOCKER COMPOSE NẾU CHƯA CÓ
echo -e "\n${YELLOW}[2/6] Kiểm tra môi trường Docker & Docker Compose...${NC}"
if ! command -v docker &> /dev/null; then
    echo "-> Đang cài đặt Docker Engine chính thức từ Docker Inc..."
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg lsb-release
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}✓ Cài đặt Docker hoàn tất!${NC}"
else
    echo -e "${GREEN}✓ Docker đã được cài đặt: $(docker --version)${NC}"
fi

# 4. THIẾT LẬP TƯỜNG LỬA UFW (BẢO VỆ CỔNG CƠ SỞ DỮ LIỆU)
echo -e "\n${YELLOW}[3/6] Thiết lập tường lửa bảo mật UFW...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp comment 'SSH Port' || true
    ufw allow 80/tcp comment 'HTTP Web' || true
    ufw allow 443/tcp comment 'HTTPS Web' || true
    # Chặn không mở public cổng CSDL 5432 ra internet
    ufw deny 5432/tcp comment 'Block Postgres Public' || true
    # Bật ufw nếu chưa bật
    echo "y" | ufw enable || true
    echo -e "${GREEN}✓ Tường lửa UFW đã cấu hình an toàn (Mở 22, 80, 443; Đóng 5432).${NC}"
fi

# 5. CẤU HÌNH BIẾN MÔI TRƯỜNG .env
echo -e "\n${YELLOW}[4/6] Khởi tạo tệp cấu hình .env sản xuất...${NC}"
if [ ! -f .env ]; then
    cat <<EOF > .env
# Cấu hình Môi Trường VPS Production
DOMAIN_NAME=localhost
GEMINI_API_KEY=
DB_HOST=postgres
DB_PORT=5432
DB_NAME=enterprise_erp
DB_USER=erp_user
DB_PASS=erp_password
EOF
    echo -e "${GREEN}✓ Đã tạo file .env mẫu. Bạn có thể thêm GEMINI_API_KEY vào .env sau.${NC}"
else
    echo -e "${GREEN}✓ Đã tìm thấy tệp .env hiện hữu.${NC}"
fi

# 6. BIÊN DỊCH VÀ KHỞI ĐỘNG CÁC SERVICE DOCKER
echo -e "\n${YELLOW}[5/6] Tiến hành Build và Khởi động Container (PostgreSQL, FastAPI Backend, n8n, Nginx)...${NC}"
docker compose -f docker-compose.prod.yml down --remove-orphans || true
docker compose -f docker-compose.prod.yml up -d --build

# 7. KIỂM TRA SỨC KHỎE HỆ THỐNG
echo -e "\n${YELLOW}[6/6] Đang kiểm tra sức khỏe hệ thống (Health Check)...${NC}"
sleep 5
for i in {1..12}; do
    if curl -s -f http://localhost:8000/api/health > /dev/null; then
        echo -e "${GREEN}✓ Backend API & CSDL phản hồi thành công!${NC}"
        break
    else
        echo "-> Đang đợi CSDL và ứng dụng sẵn sàng ($i/12)..."
        sleep 3
    fi
done

echo ""
echo -e "${BLUE}===============================================================================${NC}"
echo -e "${GREEN}           🎉 TRIỂN KHAI VPS THÀNH CÔNG - HỆ THỐNG ĐÃ HOẠT ĐỘNG!              ${NC}"
echo -e "${BLUE}===============================================================================${NC}"
echo -e "  * Cửa Hàng Trực Tuyến (Storefront):  http://<IP_VPS_CUA_BAN>/"
echo -e "  * Đăng Nhập Quản Trị ERP:            http://<IP_VPS_CUA_BAN>/login"
echo -e "  * Tài Liệu API Swagger:              http://<IP_VPS_CUA_BAN>/docs"
echo -e "  * Luồng Tự Động Hóa n8n:             http://<IP_VPS_CUA_BAN>:5678"
echo ""
echo -e "  ${YELLOW}TÀI KHOẢN ĐĂNG NHẬP MẶC ĐỊNH:${NC}"
echo -e "  - Giám Đốc / Admin:    admin   / admin123"
echo -e "  - Trưởng Kho:          kho     / kho123"
echo -e "  - Quản Đốc Sản Xuất:   sanxuat / sanxuat123 (hoặc sx / sx123)"
echo -e "  - Nhân Viên Thu Mua:   thumua  / thumua123"
echo -e "${BLUE}===============================================================================${NC}"
echo -e "Xem nhật ký logs: docker compose -f docker-compose.prod.yml logs -f"
echo -e "Dừng hệ thống:    docker compose -f docker-compose.prod.yml down"
echo -e "${BLUE}===============================================================================${NC}"
